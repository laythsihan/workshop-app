import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { headers } from "next/headers";

import { db } from "workshop/server/db";
import { sendPasswordResetEmail } from "workshop/server/email";

const bodySchema = z.object({
  email: z.string().email("Invalid email address").transform((s) => s.trim().toLowerCase()),
  returnUrl: z
    .string()
    .min(1)
    .refine((s) => !s.startsWith("http"), "Invalid return URL")
    .optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = first.email?.[0] ?? "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { email, returnUrl } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, password: true },
  });

  // Always return success to prevent email enumeration
  if (!user?.password) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const resetUrl = returnUrl
    ? `${protocol}://${host}/reset-password?token=${token}&returnUrl=${encodeURIComponent(returnUrl)}`
    : `${protocol}://${host}/reset-password?token=${token}`;

  await sendPasswordResetEmail(email, resetUrl);
  // Always return success to prevent email enumeration (do not leak send failures)
  return NextResponse.json({ success: true }, { status: 200 });
}
