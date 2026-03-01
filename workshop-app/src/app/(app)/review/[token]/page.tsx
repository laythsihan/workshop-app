import { redirect, notFound } from "next/navigation";
import { randomBytes } from "crypto";
import { auth } from "workshop/server/auth";
import { db } from "workshop/server/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function ReviewPage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/review/${token}`)}`);
  }

  const doc = await db.document.findFirst({
    where: { shareableToken: token },
    select: { id: true, ownerId: true },
  });

  if (!doc) {
    notFound();
  }

  // If user is the owner, just redirect to the document
  if (doc.ownerId === session.user.id) {
    redirect(`/documents/${doc.id}`);
  }

  // Check if invitation already exists
  const existingInvitation = await db.invitation.findFirst({
    where: {
      documentId: doc.id,
      userId: session.user.id,
    },
  });

  // Create invitation if it doesn't exist
  if (!existingInvitation) {
    await db.invitation.create({
      data: {
        token: randomBytes(32).toString("hex"),
        documentId: doc.id,
        userId: session.user.id,
        email: session.user.email ?? "",
        status: "ACCEPTED",
        invitedById: doc.ownerId,
      },
    });

    await db.activityLog.create({
      data: {
        type: "DOCUMENT_SHARED",
        documentId: doc.id,
        userId: doc.ownerId,
        metadata: {
          recipientName: session.user.name ?? session.user.email ?? undefined,
        },
      },
    });

    // Update document status to IN_REVIEW if it was DRAFT
    await db.document.updateMany({
      where: {
        id: doc.id,
        status: "DRAFT",
      },
      data: {
        status: "IN_REVIEW",
      },
    });
  }

  // Redirect to the document page
  redirect(`/documents/${doc.id}`);
}
