import { SignJWT, jwtVerify } from "jose";
import { Prisma } from "../../generated/prisma";
import { db } from "workshop/server/db";

/** Thrown when markInviteTokenUsed is called for a token that was already consumed (race condition). */
export class InviteTokenAlreadyUsedError extends Error {
  constructor() {
    super("Invite token has already been used");
    this.name = "InviteTokenAlreadyUsedError";
  }
}

const INVITE_TOKEN_EXPIRY_DAYS = 30;

/** Payload embedded in the invite JWT */
export type InviteTokenPayload = {
  documentId: string;
  invitedById: string;
  email?: string;
  jti: string;
  exp: number;
  iat: number;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is required for invite tokens. Set it in your environment."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Generate a signed invite JWT for a document.
 * Token expires in 30 days. Single-use enforced via JTI tracking.
 */
export async function generateInviteToken(params: {
  documentId: string;
  invitedById: string;
  email?: string;
}): Promise<string> {
  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + INVITE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;

  const token = await new SignJWT({
    documentId: params.documentId,
    invitedById: params.invitedById,
    ...(params.email && { email: params.email }),
    jti,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(getSecret());

  return token;
}

export type VerifyResult =
  | { valid: true; payload: InviteTokenPayload }
  | { valid: false; reason: "expired" | "invalid" | "already_used"; payload?: InviteTokenPayload };

/**
 * Verify an invite JWT: signature, expiry, and single-use (JTI not in used table).
 * Does NOT mark the token as used — call markInviteTokenUsed when granting access.
 */
export async function verifyInviteToken(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    const documentId =
      typeof payload.documentId === "string" ? payload.documentId : undefined;
    const invitedById =
      typeof payload.invitedById === "string" ? payload.invitedById : undefined;
    const jti = typeof payload.jti === "string" ? payload.jti : undefined;

    if (!documentId || !invitedById || !jti) {
      return { valid: false, reason: "invalid" };
    }

    const payloadData: InviteTokenPayload = {
      documentId,
      invitedById,
      email: typeof payload.email === "string" ? payload.email : undefined,
      jti,
      exp: typeof payload.exp === "number" ? payload.exp : 0,
      iat: typeof payload.iat === "number" ? payload.iat : 0,
    };

    // Check if token was already used (single-use enforcement)
    const used = await db.inviteTokenJti.findUnique({
      where: { jti },
    });
    if (used) {
      return { valid: false, reason: "already_used", payload: payloadData };
    }

    if (Date.now() / 1000 > payloadData.exp) {
      return { valid: false, reason: "expired", payload: payloadData };
    }

    return { valid: true, payload: payloadData };
  } catch {
    return { valid: false, reason: "invalid" };
  }
}

/**
 * Mark an invite token as used. Call when granting access (guest verification
 * or full user completing auth and landing on document).
 * Uses create + unique constraint: second concurrent request gets P2002 and
 * throws InviteTokenAlreadyUsedError, closing the verify→markUsed race window.
 */
export async function markInviteTokenUsed(params: {
  jti: string;
  documentId: string;
}): Promise<void> {
  try {
    await db.inviteTokenJti.create({
      data: {
        jti: params.jti,
        documentId: params.documentId,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new InviteTokenAlreadyUsedError();
    }
    throw e;
  }
}
