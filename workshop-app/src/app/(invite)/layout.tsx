export const dynamic = "force-dynamic";

/**
 * Minimal layout for invite entry flow — no sidebar, centered content.
 * Used by /invite/[token] for both signed-in and guest flows.
 */
export default function InviteLayout({
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
