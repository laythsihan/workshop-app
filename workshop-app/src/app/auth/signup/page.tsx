"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader, CircleAlert } from "lucide-react";

import { GoogleLogo, DiscordLogo } from "workshop/components/auth/icons";

const NAME_MIN = 2;
const NAME_MAX = 100;
const PASSWORD_MIN = 8;
const PASSWORD_REGEX = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (PASSWORD_REGEX.test(password)) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  return Math.min(4, Math.max(1, score)) as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_CONFIG: Record<number, { label: string; color: string; segments: number }> = {
  0: { label: "", color: "#9E9892", segments: 0 },
  1: { label: "Weak", color: "#A63D2F", segments: 1 },
  2: { label: "Fair", color: "#C4933F", segments: 2 },
  3: { label: "Good", color: "#4A9B6F", segments: 3 },
  4: { label: "Strong", color: "#2E7050", segments: 4 },
};

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const strength = passwordStrength(password);

  const handleOAuthSignIn = useCallback(
    async (provider: "google" | "discord") => {
      setSubmitError(null);
      setOauthProvider(provider);
      await signIn(provider, { callbackUrl, redirect: true });
      setOauthProvider(null);
    },
    [callbackUrl]
  );
  const strengthConfig =
    STRENGTH_CONFIG[strength] ?? { label: "", color: "#9E9892", segments: 0 };

  const nameValid = name.trim().length >= NAME_MIN && name.trim().length <= NAME_MAX;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid =
    password.length >= PASSWORD_MIN && PASSWORD_REGEX.test(password);
  const confirmValid = confirmPassword === password;
  const confirmMismatch = confirmPasswordTouched && confirmPassword.length > 0 && !confirmValid;

  const formValid = nameValid && emailValid && passwordValid && confirmValid;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formValid || isLoading) return;

      setSubmitError(null);
      setIsLoading(true);

      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        if (!res.ok) {
          if (data.error === "email_exists") {
            setSubmitError("An account with this email already exists. Sign in instead?");
          } else {
            setSubmitError(
              data.message ??
                data.error ??
                "Something went wrong creating your account. Please try again."
            );
          }
          setIsLoading(false);
          return;
        }

        const redirectUrl = `${callbackUrl}${callbackUrl.includes("?") ? "&" : "?"}welcome=1`;
        const result = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          callbackUrl: redirectUrl,
          redirect: false,
        });

        if (result?.error) {
          setSubmitError("Account created but sign-in failed. Please sign in manually.");
          setIsLoading(false);
          return;
        }

        if (result?.ok && result?.url) {
          window.location.href = result.url;
        } else {
          setIsLoading(false);
        }
      } catch {
        setSubmitError("Something went wrong creating your account. Please try again.");
        setIsLoading(false);
      }
    },
    [name, email, password, formValid, isLoading, callbackUrl]
  );

  const signInHref = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const inputClasses =
    "w-full rounded-[6px] border border-[#E8E4DD] bg-white px-3 py-2.5 text-body-md text-[#1A1917] placeholder:text-[#1A1917]/50 focus:border-[#B5763A] focus:outline-none focus:ring-1 focus:ring-[#B5763A] disabled:opacity-60";

  return (
    <div className="w-full max-w-[440px] space-y-6 rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-8 shadow-[0_4px_16px_rgba(26,25,23,0.08)]">
      <h1 className="font-lora text-display-sm text-[#1A1917] text-center">
        Workshop
      </h1>
      <h2 className="font-lora text-display-sm text-[#1A1917] text-center">
        Create your account
      </h2>

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

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          className={inputClasses}
          autoComplete="name"
          required
          minLength={NAME_MIN}
          maxLength={NAME_MAX}
        />
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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className={`${inputClasses} pr-10`}
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9892] hover:text-[#6B6560]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-sm first:rounded-l last:rounded-r"
                    style={{
                      backgroundColor:
                        i <= strengthConfig.segments
                          ? strengthConfig.color
                          : "#E8E4DD",
                    }}
                  />
                ))}
              </div>
              <p
                className="text-caption"
                style={{ color: strengthConfig.color }}
              >
                {strengthConfig.label}
              </p>
            </>
          )}
          {password.length > 0 && password.length < PASSWORD_MIN && (
            <p className="text-caption text-[#A63D2F]">
              Password must be at least 8 characters and include a number or
              special character.
            </p>
          )}
          {password.length >= PASSWORD_MIN && !PASSWORD_REGEX.test(password) && (
            <p className="text-caption text-[#A63D2F]">
              Password must include a number or special character.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setConfirmPasswordTouched(true)}
              disabled={isLoading}
              className={`${inputClasses} pr-10`}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9892] hover:text-[#6B6560]"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {confirmMismatch && (
            <p className="text-caption text-[#A63D2F]">
              Passwords do not match.
            </p>
          )}
        </div>

        {submitError && (
          <div
            className="flex items-start gap-2 rounded-[4px] border-l-4 border-[#A63D2F] bg-[rgba(166,61,47,0.06)] px-3 py-2"
            role="alert"
          >
            <CircleAlert
              className="size-3.5 shrink-0 text-[#A63D2F]"
              aria-hidden
            />
            <p className="text-body-sm text-[#A63D2F]">
              {submitError}
              {submitError.includes("Sign in instead?") && (
                <>{" "}
                  <Link
                    href={signInHref}
                    className="font-medium underline hover:text-[#8F3326]"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!formValid || isLoading}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[4px] bg-[#B5763A] px-4 text-label-md font-medium text-white transition hover:bg-[#9E6530] disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader className="size-4 animate-spin" aria-hidden />
              Creating your account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="text-center text-body-sm text-[#9E9892]">
        Already have an account?{" "}
        <Link
          href={signInHref}
          className="text-label-sm font-medium text-[#B5763A] hover:text-[#9E6530]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
