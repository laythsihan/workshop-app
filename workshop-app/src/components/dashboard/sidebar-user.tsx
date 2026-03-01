"use client";

import Link from "next/link";

function getInitials(name: string | null, email: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0];
    const second = parts[1]?.[0];
    if (first && second) {
      return (first + second).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "?";
}

type SidebarUserProps = {
  user: {
    name: string | null;
    email: string | null;
  } | null;
};

export function SidebarUser({ user }: SidebarUserProps) {
  if (!user) return null;

  const displayName = user.name ?? user.email ?? "Signed in";
  const initials = getInitials(user.name, user.email);

  return (
    <Link
      href="/profile"
      className="flex items-center gap-3 rounded-md p-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground"
        aria-hidden
      >
        {initials}
      </div>
      <span className="truncate font-medium">{displayName}</span>
    </Link>
  );
}
