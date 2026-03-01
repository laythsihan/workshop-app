import { env } from "workshop/env";

export default function AccountDeletedPage() {
  const supportEmail = env.SUPPORT_EMAIL ?? "support@example.com";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#F7F4EF] px-6">
      <h1 className="font-lora text-display-md text-[#1A1917]">
        Your account has been scheduled for deletion
      </h1>
      <p className="mt-6 max-w-md text-center text-body-md text-[#1A1917]">
        If this was a mistake, contact us within 7 days at{" "}
        <a
          href={`mailto:${supportEmail}`}
          className="font-medium text-[#B5763A] underline hover:text-[#9E6530]"
        >
          {supportEmail}
        </a>{" "}
        to cancel.
      </p>
    </div>
  );
}
