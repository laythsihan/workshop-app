"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

const AUTH_BASE_PATH = "/api/auth";

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextAuthSessionProvider basePath={AUTH_BASE_PATH}>
      {children}
    </NextAuthSessionProvider>
  );
}
