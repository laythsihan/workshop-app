import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-12">
      <div className="rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-8 shadow-[0_4px_16px_rgba(26,25,23,0.08)]">
        <h1 className="font-lora text-display-md text-[#1A1917]">
          Privacy policy
        </h1>
        <p className="mt-2 text-body-md text-[#6B6560]">
          We respect your privacy and are committed to protecting your personal
          data. This page summarizes how we handle your information and your
          rights.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
            Your data and your rights
          </h2>
          <p className="text-body-md text-[#1A1917]">
            We collect only what we need to run the service (account details,
            documents, comments, and related data). We do not sell your data.
            You can request access, correction, or deletion of your data at any
            time.
          </p>
          <p className="text-body-md text-[#1A1917]">
            For a clear explanation of what we collect, how long we keep it, and
            what happens when you delete your account, see our data retention
            and erasure policy:
          </p>
          <p>
            <Link
              href="/data-retention"
              className="font-medium text-[#B5763A] underline hover:text-[#9E652E]"
            >
              Data retention and your rights →
            </Link>
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
            Contact
          </h2>
          <p className="text-body-md text-[#1A1917]">
            For questions about your data or to exercise your rights, use the
            contact email provided in the app or on our website.
          </p>
        </section>

        <p className="mt-8">
          <Link
            href="/auth/signin"
            className="text-body-sm text-[#B5763A] hover:underline"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
