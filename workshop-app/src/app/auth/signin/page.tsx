"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader, CircleAlert } from "lucide-react";

import { GoogleLogo, DiscordLogo } from "workshop/components/auth/icons";

function getErrorMessage(error: string | null): string {
  if (!error) return "";
  switch (error) {
    case "CredentialsSignin":
      return "Incorrect email or password. Please try again.";
    case "OAuthAccountNotLinked":
      return "This email is already associated with a different sign-in method. Try signing in with Google or Discord.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  const displayError = signInError ?? getErrorMessage(error);

  const forgotPasswordHref = `/forgot-password?returnUrl=${encodeURIComponent(callbackUrl)}`;

  const handleOAuthSignIn = async (provider: "google" | "discord") => {
    setSignInError(null);
    setOauthProvider(provider);
    await signIn(provider, { callbackUrl, redirect: true });
    setOauthProvider(null);
  };

  const inputClasses =
    "w-full rounded-[6px] border border-[#E8E4DD] bg-white px-3 py-2.5 text-body-md text-[#1A1917] placeholder:text-[#1A1917]/50 focus:border-[#B5763A] focus:outline-none focus:ring-1 focus:ring-[#B5763A] disabled:opacity-60";

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setIsLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      callbackUrl,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setSignInError(getErrorMessage(result.error));
      return;
    }

    if (result?.ok && result?.url) {
      window.location.href = result.url;
    }
  };

  return (
    <div className="w-full max-w-[440px] space-y-6 rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-8 shadow-[0_4px_16px_rgba(26,25,23,0.08)]">
      <h1 className="font-lora text-display-sm text-[#1A1917] text-center">
        Workshop
      </h1>
      <p className="text-body-sm text-[#9E9892] text-center">
        A workshop space for writers
      </p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void handleOAuthSignIn("google")}
          disabled={!!oauthProvider}
          className="inline-flex h-10 w-full items-center justify-center gap-3 rounded-[4px] border border-[#D9D3C7] bg-white px-4 text-label-md font-medium text-[#1A1917] transition hover:bg-[#F7F4EF] disabled:opacity-60"
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
          className="inline-flex h-10 w-full items-center justify-center gap-3 rounded-[4px] border border-[#D9D3C7] bg-white px-4 text-label-md font-medium text-[#1A1917] transition hover:bg-[#F7F4EF] disabled:opacity-60"
        >
          {oauthProvider === "discord" ? (
            <Loader className="size-5 shrink-0 animate-spin" />
          ) : (
            <DiscordLogo className="size-5 shrink-0" />
          )}
          Continue with Discord
        </button>
      </div>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#D9D3C7]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#F7F4EF] px-3 text-caption text-[#9E9892]">
            or
          </span>
        </div>
      </div>

      <form onSubmit={handleCredentialsSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className={inputClasses}
          autoComplete="email"
          required
        />
        <div className="space-y-1">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className={`${inputClasses} pr-10`}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9892] hover:text-[#6B6560]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <p className="text-right">
            <Link
              href={forgotPasswordHref}
              className="text-label-sm font-medium text-[#B5763A] no-underline hover:underline hover:text-[#9E6530]"
            >
              Forgot your password?
            </Link>
          </p>
        </div>

        {displayError && (
          <div
            className="flex items-start gap-2 rounded-[4px] border-l-4 border-[#A63D2F] bg-[rgba(166,61,47,0.06)] px-3 py-2"
            role="alert"
          >
            <CircleAlert
              className="size-3.5 shrink-0 text-[#A63D2F]"
              aria-hidden
            />
            <p className="text-body-sm text-[#A63D2F]">{displayError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[4px] bg-[#B5763A] px-4 text-label-md font-medium text-white transition hover:bg-[#9E6530] disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader className="size-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="text-center text-body-sm text-[#9E9892]">
        Don&apos;t have an account?{" "}
        <Link
          href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-label-sm font-medium text-[#B5763A] hover:text-[#9E6530]"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
