import type { Session } from "next-auth";
import NextAuth from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authConfigEdge } from "workshop/server/auth/config.edge";

const publicPaths = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/data-retention",
];

const publicPrefixes = ["/invite/", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true;
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

const authConfigWithAuthorized = {
  ...authConfigEdge,
  callbacks: {
    authorized({
      auth,
      request,
    }: {
      auth: Session | null;
      request: NextRequest;
    }) {
      const pathname = request.nextUrl.pathname;

      // Skip API routes (except auth)
      if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
        return true;
      }

      const isPublic = isPublicPath(pathname);
      const isLoggedIn = !!auth?.user;

      // Public routes: allow through
      if (isPublic) {
        // Authenticated users on / should redirect to dashboard
        if (pathname === "/" && isLoggedIn) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return true;
      }

      // Protected routes: redirect unauthenticated to sign in
      if (!isLoggedIn) {
        const signInUrl = new URL("/auth/signin", request.url);
        signInUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(signInUrl);
      }

      return true;
    },
  },
};

const { auth } = NextAuth(authConfigWithAuthorized);

export default auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
