import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";

import { db } from "workshop/server/db";
import { sendWelcomeEmail } from "workshop/server/email";

const PASSWORD_REGEX = /^(?=.*[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/;

const signUpSchema = z.object({
  email: z.string().email("Invalid email address").transform((s) => s.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .refine((p) => PASSWORD_REGEX.test(p), "Password must include a number or special character"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .transform((s) => s.trim()),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.email?.[0] ?? first.password?.[0] ?? first.name?.[0] ?? "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { email, password, name } = parsed.data;

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "email_exists", message: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  await db.user.create({
    data: {
      email,
      password: hashed,
      name,
    },
  });

  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const dashboardUrl = `${protocol}://${host}/dashboard`;

  const firstName = name.split(/\s+/)[0] ?? name;
  await sendWelcomeEmail(email, firstName, dashboardUrl);

  return NextResponse.json({ success: true }, { status: 201 });
}
