import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "workshop/server/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }
  const record = await db.passwordResetToken.findUnique({
    where: { token },
    select: { usedAt: true, expiresAt: true },
  });
  const valid =
    !!record && !record.usedAt && record.expiresAt > new Date();
  return NextResponse.json({ valid }, { status: 200 });
}

const bodySchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
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
    const msg =
      first.token?.[0] ?? first.password?.[0] ?? "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { token, password } = parsed.data;

  const resetRecord = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (
    !resetRecord ||
    resetRecord.usedAt ||
    resetRecord.expiresAt < new Date()
  ) {
    return NextResponse.json(
      { error: "Invalid or expired reset link. Please request a new one." },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  await db.$transaction([
    db.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashed },
    }),
    db.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true }, { status: 200 });
}
