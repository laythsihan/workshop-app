import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-12">
      <div className="rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-8 shadow-[0_4px_16px_rgba(26,25,23,0.08)]">
        <h1 className="font-lora text-display-md text-[#1A1917]">
          Terms of Service
        </h1>
        <p className="mt-2 text-body-md text-[#6B6560]">
          Terms of Service for Workshop. This page will be updated with the full
          terms.
        </p>
        <p className="mt-8">
          <Link
            href="/"
            className="text-body-sm text-[#B5763A] hover:underline"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
