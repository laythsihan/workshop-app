import { randomBytes } from "crypto";
import type { PrismaClient, Prisma } from "../../generated/prisma";

/**
 * When a user signs in with an email that matches a Guest who was reviewing a document,
 * we: (1) migrate their comments from guestId to authorId, (2) create an Invitation so
 * they retain document access as a full user, and (3) mark the Guest as claimAttempted.
 * This enables the "Create account" flow for guests — after Discord OAuth they land back
 * on the document with full access.
 *
 * Multi-document: Matches on email across all Guest records (no documentId filter), so
 * a reviewer who was invited to several documents gets Invitations and comment migration
 * for each one.
 *
 * Known limitation: If the guest used an email that differs from their Discord account
 * (e.g. personal vs work), the migration silently skips — no Invitation or comment
 * migration. The guest would need to use the same email when creating an account.
 */
export async function claimGuestComments(
  db: PrismaClient,
  userId: string,
  email: string | null
): Promise<void> {
  if (!email?.trim()) return;

  const unclaimedGuests = await db.guest.findMany({
    where: {
      email: { equals: email.trim(), mode: "insensitive" },
      claimAttempted: false,
    },
    select: {
      id: true,
      documentId: true,
      document: { select: { ownerId: true } },
    },
  });

  if (unclaimedGuests.length === 0) return;

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const guest of unclaimedGuests) {
      await tx.comment.updateMany({
        where: { guestId: guest.id },
        data: { authorId: userId, guestId: null },
      });

      // Grant document access by creating an Invitation so the user can view the doc
      // after "Create account" (they had guest access, now they have full user access)
      const existing = await tx.invitation.findFirst({
        where: {
          documentId: guest.documentId,
          userId,
          status: "ACCEPTED",
        },
      });
      if (!existing) {
        await tx.invitation.create({
          data: {
            token: randomBytes(32).toString("hex"),
            documentId: guest.documentId,
            userId,
            status: "ACCEPTED",
            invitedById: guest.document.ownerId,
          },
        });
        await tx.activityLog.create({
          data: {
            type: "DOCUMENT_SHARED",
            documentId: guest.documentId,
            userId: guest.document.ownerId,
            metadata: { recipientName: email?.trim() ?? undefined },
          },
        });
      }

      await tx.guest.update({
        where: { id: guest.id },
        data: { claimAttempted: true },
      });
    }
  });
}
