import { NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyInviteToken,
  markInviteTokenUsed,
  InviteTokenAlreadyUsedError,
} from "workshop/server/invite-token";
import { setGuestSession } from "workshop/server/guest-session";
import { db } from "workshop/server/db";

/**
 * Security model: The invite token (JWT) is the access credential. Only someone
 * with the invite link can reach this form and submit. We do not verify email
 * ownership — the email field is for record-keeping and comment migration when
 * the guest later creates an account. This is an acceptable tradeoff.
 */
const bodySchema = z.object({
  inviteToken: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1, "Display name is required").trim(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request. Email and display name are required." },
      { status: 400 }
    );
  }

  const { inviteToken, email, displayName } = parsed.data;

  const verifyResult = await verifyInviteToken(inviteToken);
  if (!verifyResult.valid) {
    return NextResponse.json(
      { error: "Invalid or expired invite link. Please ask for a new one." },
      { status: 400 }
    );
  }

  const { documentId, jti } = verifyResult.payload;

  const doc = await db.document.findFirst({
    where: { id: documentId },
    select: { id: true, status: true },
  });

  if (!doc) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  try {
    await markInviteTokenUsed({ jti, documentId });
  } catch (e) {
    if (e instanceof InviteTokenAlreadyUsedError) {
      return NextResponse.json(
        { error: "This invite link has already been used." },
        { status: 400 }
      );
    }
    throw e;
  }

  const emailNormalized = email.toLowerCase().trim();
  const guest = await db.guest.upsert({
    where: {
      email_documentId: {
        email: emailNormalized,
        documentId,
      },
    },
    create: {
      email: emailNormalized,
      documentId,
      displayName: displayName.trim(),
    },
    update: {
      displayName: displayName.trim(),
    },
  });

  await setGuestSession({ guestId: guest.id, documentId });

  await db.document.updateMany({
    where: { id: documentId, status: "DRAFT" },
    data: { status: "IN_REVIEW" },
  });

  return NextResponse.json({
    success: true,
    documentId,
  });
}
