import { type Session } from "next-auth";
import { auth } from "workshop/server/auth";
import { getGuestSession } from "workshop/server/guest-session";

export const dynamic = "force-dynamic";
import { SmartSidebar } from "workshop/components/dashboard/smart-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "workshop/components/ui/sidebar";
import { PendingDeletionBanner } from "workshop/components/auth/pending-deletion-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: Session | null = null;
  let user: { name: string | null; email: string | null } | null = null;
  let pendingDeletion = false;
  let deletionScheduledAt: Date | null = null;

  try {
    session = await auth();
    user = session?.user
      ? {
          name: session.user.name ?? null,
          email: session.user.email ?? null,
        }
      : null;
    const sessionUser = session?.user as {
      pendingDeletion?: boolean;
      deletionScheduledAt?: Date | null;
    } | undefined;
    pendingDeletion = sessionUser?.pendingDeletion ?? false;
    deletionScheduledAt = sessionUser?.deletionScheduledAt ?? null;
  } catch (err) {
    console.error("[AppLayout] auth error:", err);
  }

  const guestSession = await getGuestSession();

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full flex-col bg-background">
        <div className="flex flex-1">
          <SmartSidebar user={user} guestSession={guestSession} />
          <SidebarInset className="flex flex-1 flex-col bg-transparent">
            {pendingDeletion && deletionScheduledAt && (
              <PendingDeletionBanner deletionScheduledAt={deletionScheduledAt} />
            )}
            <main className="flex-1 overflow-auto px-6 pt-6 pb-8">{children}</main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
