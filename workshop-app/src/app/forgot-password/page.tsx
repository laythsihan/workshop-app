"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Loader } from "lucide-react";

const RESEND_COOLDOWN_SEC = 60;

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordSkeleton />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordSkeleton() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-[#F7F4EF] px-6 py-12">
      <div className="w-full max-w-[440px] space-y-6 rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-8 shadow-[0_4px_16px_rgba(26,25,23,0.08)]">
        <div className="h-8 w-32 mx-auto rounded bg-[#E3DDD4] animate-pulse" />
        <div className="h-8 w-48 mx-auto rounded bg-[#E3DDD4] animate-pulse" />
        <div className="h-4 w-64 mx-auto rounded bg-[#E3DDD4] animate-pulse" />
        <div className="h-10 w-full rounded bg-[#E3DDD4] animate-pulse" />
        <div className="h-10 w-full rounded bg-[#E3DDD4] animate-pulse" />
      </div>
    </div>
  );
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [resendCooldown, setResendCooldown] = useState(0);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid || status === "loading") return;

      setStatus("loading");
      const emailTrimmed = email.trim().toLowerCase();

      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailTrimmed,
            ...(returnUrl ? { returnUrl } : {}),
          }),
        });
        await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus("idle");
          return;
        }
        setSubmittedEmail(emailTrimmed);
        setStatus("success");
        setResendCooldown(RESEND_COOLDOWN_SEC);
      } catch {
        setStatus("idle");
      }
    },
    [email, isValid, status, returnUrl]
  );

  const handleResend = useCallback(() => {
    if (resendCooldown > 0 || !submittedEmail) return;
    setStatus("loading");
    void fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: submittedEmail,
        ...(returnUrl ? { returnUrl } : {}),
      }),
    })
      .then(() => {
        setResendCooldown(RESEND_COOLDOWN_SEC);
      })
      .finally(() => {
        setStatus("success");
      });
  }, [submittedEmail, returnUrl, resendCooldown]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const signInHref = returnUrl
    ? `/auth/signin?callbackUrl=${encodeURIComponent(returnUrl)}`
    : "/auth/signin";

  const inputClasses =
    "w-full rounded-[6px] border border-[#E8E4DD] bg-white px-3 py-2.5 text-body-md text-[#1A1917] placeholder:text-[#1A1917]/50 focus:border-[#B5763A] focus:outline-none focus:ring-1 focus:ring-[#B5763A] disabled:opacity-60";

  if (status === "success") {
    return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center bg-[#F7F4EF] px-6 py-12">
        <div className="w-full max-w-[440px] space-y-6 rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-8 shadow-[0_4px_16px_rgba(26,25,23,0.08)]">
          <h1 className="font-lora text-display-sm text-[#1A1917] text-center">
            Workshop
          </h1>
          <div className="flex justify-center">
            <Mail className="size-8 text-[#B5763A]" aria-hidden />
          </div>
          <h2 className="font-lora text-display-sm text-[#1A1917] text-center">
            Check your email
          </h2>
          <p className="text-body-md text-[#6B6560] text-center">
            We sent a password reset link to {submittedEmail}. It expires in 1
            hour.
          </p>
          <p className="text-center">
            {resendCooldown > 0 ? (
              <span className="text-label-sm text-[#9E9892]">
                Resend email in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-label-sm font-medium text-[#B5763A] hover:underline hover:text-[#9E6530]"
              >
                Resend email
              </button>
            )}
          </p>
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

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-[#F7F4EF] px-6 py-12">
      <div className="w-full max-w-[440px] space-y-6 rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-8 shadow-[0_4px_16px_rgba(26,25,23,0.08)]">
        <h1 className="font-lora text-display-sm text-[#1A1917] text-center">
          Workshop
        </h1>
        <h2 className="font-lora text-display-sm text-[#1A1917] text-center">
          Reset your password
        </h2>
        <p className="text-body-md text-[#6B6560] text-center">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <button
            type="submit"
            disabled={!isValid || status === "loading"}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[4px] bg-[#B5763A] px-4 text-label-md font-medium text-white transition hover:bg-[#9E6530] disabled:opacity-60"
          >
            {status === "loading" ? (
              <Loader className="size-5 shrink-0 animate-spin" aria-hidden />
            ) : (
              "Send reset link"
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
