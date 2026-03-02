import Link from "next/link";
import { auth } from "workshop/server/auth";
import { redirect } from "next/navigation";
import { DangerZone } from "workshop/components/settings/danger-zone";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="mx-auto max-w-[640px] space-y-8">
      <div>
        <h1 className="font-lora text-display-xl text-[#1A1917]">
          Settings
        </h1>
        <p className="mt-2 text-body-sm text-[#6B6560]">
          Manage your account preferences and application settings.
        </p>
      </div>

      {/* Notifications Section */}
      <section className="space-y-4">
        <h2 className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
          Notifications
        </h2>
        <div className="rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label-md font-medium text-[#1A1917]">
                Email notifications
              </p>
              <p className="mt-0.5 text-body-sm text-[#6B6560]">
                Receive email updates about comments and activity on your documents.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="relative h-6 w-11 rounded-full bg-[#E3DDD4] transition-colors duration-150"
              aria-label="Toggle email notifications"
            >
              <span className="absolute left-1 top-1 size-4 rounded-full bg-white shadow transition-transform duration-150" />
            </button>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="space-y-4">
        <h2 className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
          Privacy
        </h2>
        <div className="rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label-md font-medium text-[#1A1917]">
                Profile visibility
              </p>
              <p className="mt-0.5 text-body-sm text-[#6B6560]">
                Allow other users to see your profile when you comment on their documents.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="relative h-6 w-11 rounded-full bg-[#B5763A] transition-colors duration-150"
              aria-label="Toggle profile visibility"
            >
              <span className="absolute right-1 top-1 size-4 rounded-full bg-white shadow transition-transform duration-150" />
            </button>
          </div>
        </div>
        <p className="text-body-sm text-[#6B6560]">
          <Link
            href="/privacy"
            className="font-medium text-[#B5763A] hover:underline"
          >
            Privacy policy & data retention
          </Link>
          {" — "}
          How we use your data and how to request erasure.
        </p>
      </section>

      <DangerZone />

      {/* Coming Soon Note */}
      <div className="rounded-lg border border-[#D9D3C7] bg-[#EFEBE3] p-4">
        <p className="text-body-sm text-[#6B6560]">
          <strong className="text-[#1A1917]">Note:</strong> Settings functionality is coming soon. 
          These options are currently disabled.
        </p>
      </div>

      {/* Copyright */}
      <p className="pt-8 text-center text-caption text-[#9E9892]">
        © 2026 Layth Sihan. All rights reserved.
      </p>
    </div>
  );
}
