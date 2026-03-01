import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "workshop/env";
import { db } from "workshop/server/db";
import { getSupabaseAdmin, STORAGE_BUCKET } from "workshop/server/supabase";

/**
 * Hard-deletion job: permanently removes users who have passed their deletion date.
 * Implements GDPR Right to Erasure — see DATA_RETENTION.md for policy and audit.
 *
 * Call via cron (e.g. Vercel Cron, or external service) daily.
 * If CRON_SECRET is set, requests must include: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const usersToDelete = await db.user.findMany({
    where: {
      pendingDeletion: true,
      deletionScheduledAt: { lte: now },
    },
    select: {
      id: true,
      email: true,
      ownedDocuments: {
        select: { id: true, storagePath: true },
      },
    },
  });

  const supabase = getSupabaseAdmin();
  let deletedCount = 0;

  for (const user of usersToDelete) {
    try {
      // Comments on others' documents: anonymize author
      await db.comment.updateMany({
        where: {
          authorId: user.id,
          document: { ownerId: { not: user.id } },
        },
        data: {
          authorId: null,
          deletedAuthorDisplayName: "Deleted User",
        },
      });

      // Owned document files in storage
      if (supabase) {
        for (const doc of user.ownedDocuments) {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([doc.storagePath]);
        }
      }

      // ActivityLog: null actor to preserve document history (GDPR-compliant anonymization)
      await db.activityLog.updateMany({
        where: { userId: user.id },
        data: { userId: null },
      });
      await db.documentViewer.deleteMany({ where: { userId: user.id } });
      // Notifications: to user and triggered by user
      await db.notification.deleteMany({
        where: { OR: [{ userId: user.id }, { actorId: user.id }] },
      });
      // Invitations: anonymize received (userId/email); delete sent (invitedById)
      await db.invitation.updateMany({
        where: { userId: user.id },
        data: { userId: null, email: null },
      });
      await db.invitation.deleteMany({ where: { invitedById: user.id } });
      // Guest records for this user's email
      if (user.email) {
        await db.guest.deleteMany({ where: { email: user.email } });
      }
      const docIds = user.ownedDocuments.map((d) => d.id);
      if (docIds.length > 0) {
        await db.inviteTokenJti.deleteMany({
          where: { documentId: { in: docIds } },
        });
      }
      await db.document.deleteMany({ where: { ownerId: user.id } });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.account.deleteMany({ where: { userId: user.id } });
      // PasswordResetToken / PasswordVerifyAttempt removed via User cascade
      await db.user.delete({ where: { id: user.id } });

      deletedCount++;
      // GDPR erasure audit: log anonymized id only (no PII). Use your logging service in production.
      const anonymizedId = createHash("sha256")
        .update(user.email ?? user.id)
        .digest("hex");
      console.log(
        `[GDPR Erasure] completed at ${new Date().toISOString()} anonymized_id=${anonymizedId}`
      );
    } catch (err) {
      console.error(`[AccountDeletion] Failed to delete user ${user.id}:`, err);
    }
  }

  return NextResponse.json({
    processed: usersToDelete.length,
    deleted: deletedCount,
  });
}
