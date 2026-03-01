import { cookies } from "next/headers";

const GUEST_SESSION_COOKIE = "workshop_guest_session";
/** 7-day expiry — Prompt 33 suggested 30 days, but shorter is intentional:
 * workshop review cycles are typically bounded (days/weeks), and reduces
 * stale guest sessions. Adjust if 30-day is required.
 */
const GUEST_SESSION_MAX_AGE_DAYS = 7;

export type GuestSession = {
  guestId: string;
  documentId: string;
};

/**
 * Parse and validate the guest session cookie.
 * Cookie format: base64(JSON({ guestId, documentId }))
 */
export async function getGuestSession(): Promise<GuestSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "guestId" in parsed &&
      "documentId" in parsed &&
      typeof (parsed as GuestSession).guestId === "string" &&
      typeof (parsed as GuestSession).documentId === "string"
    ) {
      return parsed as GuestSession;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Set the guest session cookie. HTTP-only, same-site, 7-day expiry.
 */
export async function setGuestSession(session: GuestSession): Promise<void> {
  const cookieStore = await cookies();
  const value = Buffer.from(JSON.stringify(session), "utf-8").toString("base64");
  cookieStore.set(GUEST_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GUEST_SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

/**
 * Clear the guest session cookie.
 */
export async function clearGuestSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_SESSION_COOKIE);
}
