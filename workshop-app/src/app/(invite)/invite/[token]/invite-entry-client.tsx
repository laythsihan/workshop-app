"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader } from "lucide-react";
import { DiscordLogo, GoogleLogo } from "workshop/components/auth/icons";

type Props = {
  documentTitle: string;
  inviterName: string;
  inviteToken: string;
};

/**
 * Two-path invite entry: Create full account (Discord/Google/Email) or continue as guest (direct access).
 * Display name is required for the guest path. Guest submit grants access immediately.
 */
export function InviteEntryClient({
  documentTitle,
  inviterName,
  inviteToken,
}: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [emailFormExpanded, setEmailFormExpanded] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<"signin" | "signup">("signin");
  const [emailAuthEmail, setEmailAuthEmail] = useState("");
  const [emailAuthPassword, setEmailAuthPassword] = useState("");
  const [emailAuthName, setEmailAuthName] = useState("");
  const [emailAuthStatus, setEmailAuthStatus] = useState<"idle" | "loading" | "error">("idle");
  const [emailAuthError, setEmailAuthError] = useState<string | null>(null);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);

  const callbackUrl = `/invite/${inviteToken}`;

  const handleOAuthSignIn = async (provider: "google" | "discord") => {
    setErrorMessage(null);
    setOauthProvider(provider);
    await signIn(provider, { callbackUrl, redirect: true });
    setOauthProvider(null);
  };

  const isGuestFormValid =
    displayName.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const isEmailAuthFormValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAuthEmail.trim()) &&
    (emailAuthMode === "signin"
      ? emailAuthPassword.length > 0
      : emailAuthPassword.length >= 8);

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAuthStatus("loading");
    setEmailAuthError(null);

    if (emailAuthMode === "signup") {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailAuthEmail.trim().toLowerCase(),
            password: emailAuthPassword,
            name: emailAuthName.trim() || undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setEmailAuthStatus("error");
          setEmailAuthError(data.error ?? "Sign up failed. Please try again.");
          return;
        }
      } catch {
        setEmailAuthStatus("error");
        setEmailAuthError("Sign up failed. Please try again.");
        return;
      }
    }

    const result = await signIn("credentials", {
      email: emailAuthEmail.trim().toLowerCase(),
      password: emailAuthPassword,
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      setEmailAuthStatus("error");
      setEmailAuthError("Invalid email or password.");
      return;
    }

    if (result?.ok && result?.url) {
      window.location.href = result.url;
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGuestFormValid) return;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/invite/create-guest-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          inviteToken,
          email: email.trim(),
          displayName: displayName.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        documentId?: string;
      };

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (data.documentId) {
        window.location.href = `/documents/${data.documentId}`;
      } else {
        setStatus("error");
        setErrorMessage("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  const inputClasses =
    "w-full rounded-[6px] border border-[#E8E4DD] bg-white px-3 py-2.5 text-body-md text-[#1A1917] placeholder:text-[#1A1917]/50 focus:border-[#B5763A] focus:outline-none focus:ring-1 focus:ring-[#B5763A] disabled:opacity-60";
  const btnPrimaryClasses =
    "inline-flex w-full items-center justify-center rounded-[4px] bg-[#B5763A] px-4 py-2.5 text-label-md font-medium text-white transition hover:bg-[#9E6530] disabled:opacity-60";

  return (
    <div className="w-full max-w-md space-y-6 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-8 shadow-sm">
      {/* Header */}
      <div className="mb-4 space-y-1">
        <p className="text-body-md text-[#6B6560]">
          {inviterName} invited you to review
        </p>
        <h1 className="font-lora text-display-md text-[#1A1917]">
          {documentTitle}
        </h1>
      </div>
      <div className="h-px border-t border-[#D9D3C7]" />

      {/* Path A — Create a full account */}
      <div className="space-y-2">
        <h2 className="text-label-md font-medium text-[#1A1917]">
          Create an account
        </h2>
        <p className="text-body-sm text-[#6B6560]">
          Upload your own work, invite collaborators, and access everything from
          one place
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => void handleOAuthSignIn("google")}
            disabled={!!oauthProvider}
            className="inline-flex w-full items-center justify-center gap-3 rounded-[4px] border border-[#D9D3C7] bg-white px-4 py-2.5 text-label-md font-medium text-[#1A1917] transition hover:border-[#B8B0A4] hover:bg-[#F7F4EF] disabled:opacity-60"
          >
            {oauthProvider === "google" ? (
              <Loader className="size-5 shrink-0 animate-spin" />
            ) : (
              <GoogleLogo className="size-5 shrink-0" />
            )}
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => void handleOAuthSignIn("discord")}
            disabled={!!oauthProvider}
            className="inline-flex w-full items-center justify-center gap-3 rounded-[4px] border border-[#D9D3C7] bg-transparent px-4 py-2.5 text-label-md font-medium text-[#1A1917] transition hover:border-[#B8B0A4] hover:bg-[#EFEBE3] disabled:opacity-60"
          >
            {oauthProvider === "discord" ? (
              <Loader className="size-5 shrink-0 animate-spin" />
            ) : (
              <DiscordLogo className="size-5 shrink-0" />
            )}
            Continue with Discord
          </button>
        </div>
        <div className="relative pt-2">
          <div className="absolute inset-0 flex items-center pt-2">
            <div className="w-full border-t border-[#D9D3C7]" />
          </div>
          <div className="relative flex justify-center pt-2">
            <span className="bg-[#F7F4EF] px-3 text-caption text-[#9E9892]">
              or
            </span>
          </div>
        </div>
        {!emailFormExpanded ? (
          <button
            type="button"
            onClick={() => setEmailFormExpanded(true)}
            className="inline-flex w-full items-center justify-center rounded-[4px] px-4 py-2.5 text-label-md font-medium text-[#B5763A] transition hover:text-[#9E6530]"
          >
            Sign in with email
          </button>
        ) : (
          <form
            onSubmit={handleEmailAuthSubmit}
            className="flex flex-col gap-3 rounded-[6px] border border-[#E8E4DD] bg-white p-4"
          >
            <div className="flex gap-2 border-b border-[#E8E4DD] pb-2">
              <button
                type="button"
                onClick={() => {
                  setEmailAuthMode("signin");
                  setEmailAuthError(null);
                }}
                className={`flex-1 rounded-[4px] px-3 py-1.5 text-caption font-medium transition ${
                  emailAuthMode === "signin"
                    ? "bg-[#B5763A]/10 text-[#B5763A]"
                    : "text-[#6B6560] hover:bg-[#EFEBE3]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailAuthMode("signup");
                  setEmailAuthError(null);
                }}
                className={`flex-1 rounded-[4px] px-3 py-1.5 text-caption font-medium transition ${
                  emailAuthMode === "signup"
                    ? "bg-[#B5763A]/10 text-[#B5763A]"
                    : "text-[#6B6560] hover:bg-[#EFEBE3]"
                }`}
              >
                Sign up
              </button>
            </div>
            <input
              type="email"
              placeholder="you@example.com"
              value={emailAuthEmail}
              onChange={(e) => setEmailAuthEmail(e.target.value)}
              disabled={emailAuthStatus === "loading"}
              className={inputClasses}
              autoComplete="email"
              required
            />
            {emailAuthMode === "signup" && (
              <input
                type="text"
                placeholder="Your name (optional)"
                value={emailAuthName}
                onChange={(e) => setEmailAuthName(e.target.value)}
                disabled={emailAuthStatus === "loading"}
                className={inputClasses}
                autoComplete="name"
              />
            )}
            <div className="space-y-1">
              <input
                type="password"
                placeholder={emailAuthMode === "signup" ? "Password (min 8 characters)" : "Password"}
                value={emailAuthPassword}
                onChange={(e) => setEmailAuthPassword(e.target.value)}
                disabled={emailAuthStatus === "loading"}
                className={inputClasses}
                autoComplete={emailAuthMode === "signup" ? "new-password" : "current-password"}
                required
              />
              {emailAuthMode === "signin" && (
                <p className="text-right">
                  <Link
                    href={`/forgot-password?returnUrl=${encodeURIComponent(callbackUrl)}`}
                    className="text-caption text-[#B5763A] hover:text-[#9E6530]"
                  >
                    Forgot password?
                  </Link>
                </p>
              )}
            </div>
            {emailAuthError && (
              <p className="text-caption text-[#A63D2F]">{emailAuthError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmailFormExpanded(false);
                  setEmailAuthError(null);
                }}
                className="flex-1 rounded-[4px] border border-[#D9D3C7] bg-transparent px-4 py-2.5 text-label-md font-medium text-[#1A1917] transition hover:border-[#B8B0A4] hover:bg-[#EFEBE3] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isEmailAuthFormValid || emailAuthStatus === "loading"}
                className="flex-1 rounded-[4px] bg-[#B5763A] px-4 py-2.5 text-label-md font-medium text-white transition hover:bg-[#9E6530] disabled:opacity-60"
              >
                {emailAuthStatus === "loading"
                  ? "Please wait…"
                  : emailAuthMode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#D9D3C7]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#F7F4EF] px-3 text-caption text-[#9E9892]">
            or
          </span>
        </div>
      </div>

      {/* Path B — Continue as guest */}
      <div className="space-y-2">
        <h2 className="text-label-md font-medium text-[#1A1917]">
          Continue as guest
        </h2>
        <p className="text-body-sm text-[#6B6560]">
          Leave comments on this document without creating an account
        </p>
        <form onSubmit={handleGuestSubmit} className="flex flex-col gap-3 pt-1">
          <input
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={status === "loading"}
            className={inputClasses}
            autoComplete="name"
            required
          />
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading"}
            className={inputClasses}
            autoComplete="email"
            required
          />
          <p className="text-caption text-[#9E9892]">
            Used to save your comments if you create an account later
          </p>
          {errorMessage && (
            <p className="text-caption text-[#A63D2F]">{errorMessage}</p>
          )}
          <button
            type="submit"
            disabled={!isGuestFormValid || status === "loading"}
            className={btnPrimaryClasses}
          >
            {status === "loading" ? "Entering…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
