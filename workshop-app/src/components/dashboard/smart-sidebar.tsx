"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { DocumentSidebar } from "../documents/document-sidebar";
import type { GuestSession } from "workshop/server/guest-session";

type SmartSidebarProps = {
  user: { name: string | null; email: string | null } | null;
  guestSession: GuestSession | null;
};

export function SmartSidebar({ user, guestSession }: SmartSidebarProps) {
  const pathname = usePathname();

  const documentRegex = /^\/documents\/([^/]+)/;
  const documentMatch = documentRegex.exec(pathname);
  const documentId = documentMatch?.[1];

  const isGuestOnDoc =
    !!documentId && !!guestSession && guestSession.documentId === documentId;

  if (documentId) {
    return (
      <DocumentSidebar
        documentId={documentId}
        user={user}
        isGuest={isGuestOnDoc}
      />
    );
  }

  return <AppSidebar user={user} />;
}
