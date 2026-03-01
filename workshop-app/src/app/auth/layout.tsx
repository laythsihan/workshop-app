export const dynamic = "force-dynamic";

/**
 * Minimal layout for auth pages (sign-in, sign-up) — same as invite flow.
 * No sidebar, centered content on #F7F4EF background.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-[#F7F4EF] px-6 py-12">
      {children}
    </div>
  );
}
