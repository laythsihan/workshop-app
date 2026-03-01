"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader, CheckCircle } from "lucide-react";

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordSkeleton() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-[#F7F4EF] px-6 py-12">
      <div className="w-full max-w-[440px] space-y-6 rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-8 shadow-[0_4px_16px_rgba(26,25,23,0.08)]">
        <div className="h-8 w-32 mx-auto rounded bg-[#E3DDD4] animate-pulse" />
        <div className="h-8 w-48 mx-auto rounded bg-[#E3DDD4] animate-pulse" />
        <div className="h-10 w-full rounded bg-[#E3DDD4] animate-pulse" />
        <div className="h-10 w-full rounded bg-[#E3DDD4] animate-pulse" />
        <div className="h-10 w-full rounded bg-[#E3DDD4] animate-pulse" />
      </div>
    </div>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const returnUrl = searchParams.get("returnUrl");

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const strength = passwordStrength(password);
  const strengthConfig =
    STRENGTH_CONFIG[strength] ?? { label: "", color: "#9E9892", segments: 0 };
  const passwordValid = password.length >= PASSWORD_MIN && PASSWORD_REGEX.test(password);
  const confirmValid = confirmPassword === password;
  const confirmMismatch = confirmPasswordTouched && confirmPassword.length > 0 && !confirmValid;
  const isValid = passwordValid && confirmValid;

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data: { valid?: boolean }) => setTokenValid(!!data.valid))
      .catch(() => setTokenValid(false));
  }, [token]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token || !isValid || status === "loading") return;

      setStatus("loading");
      setErrorMessage(null);

      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };

        if (!res.ok) {
          setStatus("error");
          setErrorMessage(data.error ?? "Failed to reset password. Please try again.");
          return;
        }
        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMessage("Failed to reset password. Please try again.");
      }
    },
    [token, password, isValid, status]
  );

  const signInHref = returnUrl
    ? `/auth/signin?callbackUrl=${encodeURIComponent(returnUrl)}`
    : "/auth/signin";

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => router.push(signInHref), 3000);
    return () => clearTimeout(t);
  }, [status, router, signInHref]);

  const inputClasses =
    "w-full rounded-[6px] border border-[#E8E4DD] bg-white px-3 py-2.5 text-body-md text-[#1A1917] placeholder:text-[#1A1917]/50 focus:border-[#B5763A] focus:outline-none focus:ring-1 focus:ring-[#B5763A] disabled:opacity-60";

  const cardLayout =
    "w-full max-w-[440px] space-y-6 rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-8 shadow-[0_4px_16px_rgba(26,25,23,0.08)]";
  const pageLayout =
    "flex min-h-svh w-full flex-col items-center justify-center bg-[#F7F4EF] px-6 py-12";

  if (tokenValid === null) {
    return (
      <div className={pageLayout}>
        <div className={cardLayout}>
          <div className="flex justify-center py-8">
            <Loader className="size-8 animate-spin text-[#9E9892]" aria-hidden />
          </div>
        </div>
      </div>
    );
  }

  if (!token || tokenValid === false) {
    return (
      <div className={pageLayout}>
        <div className={cardLayout}>
          <h1 className="font-lora text-display-sm text-[#1A1917] text-center">
            Workshop
          </h1>
          <h2 className="font-lora text-display-sm text-[#1A1917] text-center">
            Invalid or expired link
          </h2>
          <p className="text-body-md text-[#6B6560] text-center">
            This reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="flex h-10 w-full items-center justify-center rounded-[4px] bg-[#B5763A] px-4 text-label-md font-medium text-white transition hover:bg-[#9E6530]"
          >
            Request a new link
          </Link>
        </div>
        <p className="mt-6 text-center">
          <Link
            href={signInHref}
            className="text-label-sm font-medium text-[#B5763A] no-underline hover:underline hover:text-[#9E6530]"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className={pageLayout}>
        <div className={cardLayout}>
          <h1 className="font-lora text-display-sm text-[#1A1917] text-center">
            Workshop
          </h1>
          <div className="flex justify-center">
            <CheckCircle className="size-6 text-[#4A9B6F]" aria-hidden />
          </div>
          <h2 className="font-lora text-display-sm text-[#1A1917] text-center">
            Password updated
          </h2>
          <p className="text-body-md text-[#6B6560] text-center">
            Your password has been updated. You can now sign in.
          </p>
          <Link
            href={signInHref}
            className="flex h-10 w-full items-center justify-center rounded-[4px] bg-[#B5763A] px-4 text-label-md font-medium text-white transition hover:bg-[#9E6530]"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={pageLayout}>
      <div className={cardLayout}>
        <h1 className="font-lora text-display-sm text-[#1A1917] text-center">
          Workshop
        </h1>
        <h2 className="font-lora text-display-sm text-[#1A1917] text-center">
          Choose a new password
        </h2>
        <p className="text-body-md text-[#6B6560] text-center">
          Enter your new password below. It must be at least 8 characters and
          include a number or special character.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status === "loading"}
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
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
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
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmPasswordTouched(true)}
                disabled={status === "loading"}
                className={`${inputClasses} pr-10`}
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN}
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

          {errorMessage && (
            <p className="text-caption text-[#A63D2F]">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={!isValid || status === "loading"}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[4px] bg-[#B5763A] px-4 text-label-md font-medium text-white transition hover:bg-[#9E6530] disabled:opacity-60"
          >
            {status === "loading" ? (
              <Loader className="size-5 shrink-0 animate-spin" aria-hidden />
            ) : (
              "Reset password"
            )}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center">
        <Link
          href={signInHref}
          className="text-label-sm font-medium text-[#B5763A] no-underline hover:underline hover:text-[#9E6530]"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
