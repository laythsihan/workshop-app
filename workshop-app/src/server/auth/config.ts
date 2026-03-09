import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { db } from "workshop/server/db";
import { claimGuestComments } from "workshop/server/guest-claim";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      pendingDeletion?: boolean;
      deletionScheduledAt?: Date | null;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    DiscordProvider({
      clientId: process.env.AUTH_DISCORD_ID ?? "",
      clientSecret: process.env.AUTH_DISCORD_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email;
        const rawPassword = credentials?.password;
        if (
          rawEmail == null ||
          rawPassword == null ||
          typeof rawEmail !== "string" ||
          typeof rawPassword !== "string"
        )
          return null;
        const email = rawEmail.trim().toLowerCase();
        const password = rawPassword;

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          pendingDeletion: user.pendingDeletion,
          deletionScheduledAt: user.deletionScheduledAt,
        };
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  pages: { signIn: "/auth/signin" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    jwt: async ({ token, user }) => {
      try {
        if (user?.id && typeof user.id === "string") {
          token.id = user.id;
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { pendingDeletion: true, deletionScheduledAt: true },
          });
          token.pendingDeletion = dbUser?.pendingDeletion ?? false;
          token.deletionScheduledAt = dbUser?.deletionScheduledAt ?? null;
          const email = (user as { email?: string | null }).email;
          if (email && typeof email === "string") {
            try {
              await claimGuestComments(db, user.id, email);
            } catch (err) {
              console.error("[Auth] claimGuestComments failed:", err);
            }
          }
        }
      } catch (err) {
        console.error("[Auth] jwt callback error:", err);
      }
      return token;
    },
    session: async ({ session, token }) => {
      return {
        ...session,
        user: {
          ...session.user,
          id: typeof token.id === "string" ? token.id : "",
          pendingDeletion: Boolean(token.pendingDeletion),
          deletionScheduledAt: token.deletionScheduledAt as Date | null | undefined,
        },
      };
    },
  },
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;
