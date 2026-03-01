"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  Settings,
  HelpCircle,
  LogOut,
  User,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  UserPlus,
  UserMinus,
} from "lucide-react";

import { cn } from "workshop/lib/utils";
import {
  SIDEBAR_WIDTH_COLLAPSED_CLASS,
  SIDEBAR_WIDTH_EXPANDED_CLASS,
} from "workshop/lib/sidebar-constants";
import { api } from "workshop/trpc/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "workshop/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "workshop/components/ui/tooltip";
import {
  formatActivityLabel,
  formatRelativeTime,
  type ActivityTypeForLabel,
} from "workshop/lib/format-activity-label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "workshop/components/ui/dialog";
import { ReviewersInviteList } from "workshop/components/documents/reviewers-invite-list";
import { CounterBadge } from "workshop/components/ui/counter-badge";

const COLLABORATORS_STORAGE_KEY = "sidebar_collaborators_collapsed";
const ACTIVITY_STORAGE_KEY = "sidebar_collaborator_activity_collapsed";
const ACTIVITY_STORAGE_KEY_LEGACY = "sidebar_activity_collapsed";

function getStoredCollapsed(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return stored === "true";
}

function getActivityCollapsedState(): boolean {
  if (typeof window === "undefined") return false;
  const next = localStorage.getItem(ACTIVITY_STORAGE_KEY);
  if (next !== null) return next === "true";
  const legacy = localStorage.getItem(ACTIVITY_STORAGE_KEY_LEGACY);
  if (legacy !== null) {
    const value = legacy === "true";
    setStoredCollapsed(ACTIVITY_STORAGE_KEY, value);
    localStorage.removeItem(ACTIVITY_STORAGE_KEY_LEGACY);
    return value;
  }
  return false;
}

function setStoredCollapsed(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value ? "true" : "false");
}

const scrollbarClass =
  "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[2px] [&::-webkit-scrollbar-thumb]:bg-[#D9D3C7] [&::-webkit-scrollbar-thumb:hover]:bg-[#B8B0A4]";

type DocumentSidebarProps = {
  documentId: string;
  user: { name: string | null; email: string | null } | null;
  isGuest?: boolean;
};

const utilityNavItems = [
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Help & Docs", href: "/help", icon: HelpCircle },
];

function getInitials(name: string | null, email: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0];
    const second = parts[1]?.[0];
    if (first && second) return (first + second).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function Avatar({
  name,
  email,
  image,
  size = "md",
}: {
  name: string | null;
  email: string | null;
  image?: string | null;
  size?: "sm" | "md";
}) {
  const sizeClasses = size === "sm" ? "size-6" : "size-8";
  const textClasses = size === "sm" ? "text-[10px]" : "text-label-sm";

  if (image) {
    const sizePx = size === "sm" ? 24 : 32;
    return (
      <Image
        src={image}
        alt={name ?? "User"}
        width={sizePx}
        height={sizePx}
        className={`${sizeClasses} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full bg-[#E3DDD4] ${textClasses} font-medium text-[#6B6560]`}
    >
      {getInitials(name, email)}
    </div>
  );
}

function SkeletonRow() {
  return <div className="h-10 animate-pulse rounded bg-[#E3DDD4]" />;
}

function RailIconButton({
  icon: Icon,
  tooltip,
  onClick,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  onClick?: () => void;
  href?: string;
}) {
  const buttonContent = (
    <div className="flex size-8 items-center justify-center rounded text-[#9E9892] transition-all duration-150 hover:bg-[#E3DDD4] hover:text-[#1A1917]">
      <Icon className="size-4" />
    </div>
  );

  // When onClick is provided (e.g. guest interception), use button; otherwise use Link
  const trigger = onClick ? (
    <button type="button" onClick={onClick}>
      {buttonContent}
    </button>
  ) : href ? (
    <Link href={href}>{buttonContent}</Link>
  ) : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="rounded bg-[#1A1917] px-2 py-1 text-caption text-[#EDE9E1]"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function DocumentSidebar({
  documentId,
  user: initialUser,
  isGuest = false,
}: DocumentSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(isGuest);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: userData } = api.user.me.useQuery(undefined, {
    enabled: !isGuest,
  });
  const user = isGuest
    ? null
    : userData
      ? { name: userData.displayName ?? userData.name, email: userData.email }
      : initialUser;

  const {
    data: collaboratorsData,
    isLoading: collaboratorsLoading,
  } = api.document.collaborators.useQuery({ documentId });
  const collaborators = collaboratorsData?.collaborators ?? [];
  const isDocumentOwner = collaboratorsData?.isDocumentOwner ?? false;
  const [inviteByEmailOpen, setInviteByEmailOpen] = useState(false);
  const [removeTargetInvitationId, setRemoveTargetInvitationId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const [collaboratorsCollapsed, setCollaboratorsCollapsedState] = useState(true);
  const [activityCollapsed, setActivityCollapsedState] = useState(false);
  useEffect(() => {
    setCollaboratorsCollapsedState(getStoredCollapsed(COLLABORATORS_STORAGE_KEY, true));
    setActivityCollapsedState(getActivityCollapsedState());
  }, []);
  const setCollaboratorsCollapsed = useCallback((value: boolean) => {
    setCollaboratorsCollapsedState(value);
    setStoredCollapsed(COLLABORATORS_STORAGE_KEY, value);
  }, []);
  const setActivityCollapsed = useCallback((value: boolean) => {
    setActivityCollapsedState(value);
    setStoredCollapsed(ACTIVITY_STORAGE_KEY, value);
  }, []);

  const utils = api.useUtils();
  const removeCollaboratorMutation = api.document.removeCollaborator.useMutation({
    onSuccess: () => {
      setRemoveTargetInvitationId(null);
      setRemoveError(null);
      toast.success("Reviewer removed", { duration: 2000 });
      void utils.document.collaborators.invalidate({ documentId });
      void utils.document.listInvitations.invalidate({ documentId });
    },
    onError: (err) => {
      setRemoveError(err.message ?? "Couldn't remove reviewer. Try again.");
    },
  });

  const {
    data: activities,
    isLoading: activitiesLoading,
  } = api.document.activity.useQuery({ documentId });

  const sidebarWidth = isCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED_CLASS
    : SIDEBAR_WIDTH_EXPANDED_CLASS;

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "sticky top-0 flex h-screen flex-col border-r border-[#D9D3C7] bg-[#EFEBE3] transition-all duration-200 ease-out",
          sidebarWidth
        )}
      >
        {/* Collapsed Rail */}
        {isCollapsed ? (
          <div className="flex h-full flex-col">
            <div className="flex flex-col items-center pt-3">
              <RailIconButton
                icon={ChevronRight}
                tooltip="Expand sidebar"
                onClick={() => setIsCollapsed(false)}
              />
              {!isGuest && (
                <div className="mt-3">
                  <RailIconButton
                    icon={ChevronLeft}
                    tooltip="Back to My Projects"
                    href="/dashboard"
                  />
                </div>
              )}
              <div className="mx-auto my-2 w-6 border-t border-[#D9D3C7]" />
              <RailIconButton icon={Users} tooltip="Collaborators" onClick={() => setIsCollapsed(false)} />
            </div>

            <div className="mt-auto flex flex-col items-center pb-3">
              {!isGuest && (
                <>
                  <RailIconButton
                    icon={Settings}
                    tooltip="Settings"
                    href="/settings"
                  />
                  <div className="mt-1">
                    <RailIconButton
                      icon={HelpCircle}
                      tooltip="Help & Docs"
                      href="/help"
                    />
                  </div>
                </>
              )}
              {user && (
                <div className="mt-2">
                  <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center rounded-full bg-[#D9D3C7] text-xs font-medium text-[#1A1917] transition-all duration-150 hover:bg-[#C8C0B4]"
                      >
                        {getInitials(user.name, user.email)}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="end"
                      sideOffset={8}
                      className="w-48 rounded-md border border-[#D9D3C7] bg-[#F7F4EF] p-2 shadow-[0_8px_24px_rgba(26,25,23,0.14)]"
                    >
                      <Link
                        href="/profile"
                        className="flex h-8 items-center gap-2 rounded px-4 text-body-sm text-[#1A1917] transition-colors hover:bg-[#EFEBE3]"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="size-4" />
                        Profile
                      </Link>
                      <Link
                        href="#"
                        className="flex h-8 items-center gap-2 rounded px-4 text-body-sm text-[#1A1917] transition-colors hover:bg-[#EFEBE3]"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <CreditCard className="size-4" />
                        Billing
                      </Link>
                      <div className="my-1 border-t border-[#D9D3C7]" />
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex h-8 w-full items-center gap-2 rounded px-4 text-body-sm text-[#A63D2F] transition-colors hover:bg-[#EFEBE3]"
                      >
                        <LogOut className="size-4" />
                        Sign Out
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Expanded Sidebar */
          <>
            {/* Back Navigation Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#D9D3C7] px-4">
              {isGuest ? (
                <span className="text-label-md text-[#6B6560]">
                  Reviewing
                </span>
              ) : (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-[#6B6560] transition-colors hover:text-[#1A1917]"
                >
                  <ChevronLeft className="size-3.5 text-[#9E9892]" />
                  <span className="text-label-md">My Projects</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="flex size-8 items-center justify-center rounded text-[#9E9892] transition-all duration-150 hover:bg-[#E3DDD4] hover:text-[#1A1917]"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>

            {/* Content: flex column — Collaborator Activity first, then Collaborators, flush stacking */}
            <div className="relative flex min-h-0 flex-1 flex-col pb-[180px]">
              {/* Collaborator Activity Section — collapsible, expanded by default, content-sized */}
              <div className="shrink-0 flex flex-col">
                <button
                  type="button"
                  onClick={() => setActivityCollapsed(!activityCollapsed)}
                  className="flex w-full items-center justify-between gap-2 rounded-[4px] px-4 py-3 transition-colors duration-150 hover:bg-[#E3DDD4]"
                  aria-expanded={!activityCollapsed}
                  aria-label="Collaborator activity"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
                      Collaborator Activity
                    </span>
                    {activityCollapsed && (
                      <CounterBadge
                        count={activitiesLoading ? 0 : (activities?.length ?? 0)}
                        variant="default"
                      />
                    )}
                  </div>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-[#9E9892] transition-colors duration-150 hover:text-[#1A1917]">
                    {activityCollapsed ? (
                      <ChevronRight className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-[max-height] duration-200 ease-out"
                  style={{ maxHeight: activityCollapsed ? 0 : 1000 }}
                >
                  <div
                    className={cn("min-h-0 max-h-full overflow-y-auto", scrollbarClass)}
                  >
                    {activitiesLoading ? (
                      <div className="space-y-2 px-4">
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </div>
                    ) : activities && activities.length > 0 ? (
                      <div>
                        {activities.map((activity, index) => (
                          <div
                            key={activity.id}
                            className={cn(
                              "flex items-start gap-3 px-4 py-3",
                              index < activities.length - 1 && "border-b border-[#D9D3C7]"
                            )}
                          >
                      <Avatar
                            name={activity.user?.displayName ?? activity.user?.name ?? "Deleted User"}
                            email={activity.user?.email ?? null}
                            image={activity.user?.image}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-body-sm text-[#1A1917]">
                              {formatActivityLabel("document", activity.type as ActivityTypeForLabel, {
                                actorName: activity.user?.displayName ?? activity.user?.name ?? "Deleted User",
                                  metadata: activity.metadata as { newStatus?: string; recipientName?: string } | null,
                                })}
                              </p>
                              <p className="text-caption text-[#9E9892]">
                                {formatRelativeTime(activity.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <span className="text-caption text-[#9E9892]">
                          No collaborator activity yet
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider — always visible, flush with sections */}
              <div className="shrink-0 border-t border-[#D9D3C7]" />

              {/* Collaborators Section — collapsible, collapsed by default, content-sized */}
              <div className="shrink-0 flex flex-col">
                <button
                  type="button"
                  onClick={() => setCollaboratorsCollapsed(!collaboratorsCollapsed)}
                  className="flex w-full items-center justify-between gap-2 rounded-[4px] px-4 py-3 transition-colors duration-150 hover:bg-[#E3DDD4]"
                  aria-expanded={!collaboratorsCollapsed}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
                      Collaborators
                    </span>
                    {collaboratorsCollapsed && (
                      <CounterBadge
                        count={collaboratorsLoading ? 0 : (collaborators?.length ?? 0)}
                        variant="default"
                      />
                    )}
                  </div>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-[#9E9892] transition-colors duration-150 hover:text-[#1A1917]">
                    {collaboratorsCollapsed ? (
                      <ChevronRight className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-[max-height] duration-200 ease-out"
                  style={{ maxHeight: collaboratorsCollapsed ? 0 : 1000 }}
                >
                  <div className="flex h-full flex-col">
                    {/* Collaborators list — scrolls when long */}
                    <div
                      className={cn("min-h-0 flex-1 overflow-y-auto", scrollbarClass)}
                    >
                      {collaboratorsLoading ? (
                        <div className="space-y-2 px-4">
                          <SkeletonRow />
                          <SkeletonRow />
                        </div>
                      ) : collaborators && collaborators.length > 0 ? (
                        <div>
                          {collaborators.map((collab) => {
                            const invitationId = "invitationId" in collab ? (collab as { invitationId?: string }).invitationId : undefined;
                            const canRemove = isDocumentOwner && !collab.isOwner && !collab.isGuest && invitationId;
                            const isRemoveConfirm = canRemove && removeTargetInvitationId === invitationId;
                            const displayName = collab.name ?? collab.email ?? "Unknown";

                            if (isRemoveConfirm) {
                              return (
                                <div
                                  key={collab.id}
                                  className="flex flex-col gap-2 px-4 py-2"
                                >
                                  <p className="text-body-sm text-[#1A1917]">
                                    {displayName} will lose access to this document. Their
                                    comments will remain.
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRemoveTargetInvitationId(null);
                                        setRemoveError(null);
                                      }}
                                      className="text-label-sm text-[#6B6560] hover:underline"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!invitationId) return;
                                        removeCollaboratorMutation.mutate(
                                          { invitationId },
                                          { onSuccess: () => setRemoveTargetInvitationId(null) }
                                        );
                                      }}
                                      disabled={removeCollaboratorMutation.isPending}
                                      className="text-label-sm font-medium text-[#A63D2F] hover:underline disabled:opacity-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  {removeError && (
                                    <p className="text-caption text-[#A63D2F]">
                                      {removeError}
                                    </p>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={collab.id}
                                className="flex h-10 items-center gap-3 px-4"
                              >
                                <Avatar
                                  name={collab.name}
                                  email={collab.email}
                                  image={collab.image}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-label-md font-medium text-[#1A1917]">
                                      {displayName}
                                    </span>
                                    {collab.isCurrentUser ? (
                                      <span className="shrink-0 text-label-sm font-medium text-[#9E9892]">
                                        (You)
                                      </span>
                                    ) : collab.isOwner ? (
                                      <span className="shrink-0 text-label-sm font-medium text-[#B5763A]">
                                        (Author)
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                {canRemove && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRemoveError(null);
                                          setRemoveTargetInvitationId(invitationId ?? null);
                                        }}
                                        className="flex size-6 shrink-0 items-center justify-center rounded text-[#9E9892] transition-colors hover:text-[#A63D2F]"
                                      >
                                        <UserMinus className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="rounded bg-[#1A1917] px-2 py-1 text-caption text-[#EDE9E1]">
                                      Remove reviewer
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <Users className="mb-2 size-4 text-[#9E9892]" />
                          <span className="text-caption text-[#9E9892]">
                            Only you have access
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Invite by email — sticky to bottom of accordion, flex-shrink: 0 */}
                    {isDocumentOwner && (
                      <button
                        type="button"
                        onClick={() => setInviteByEmailOpen(true)}
                        className="flex shrink-0 items-center justify-center gap-2 border-t border-[#D9D3C7] bg-[#EFEBE3] px-4 py-0 transition-colors hover:bg-[#E3DDD4] h-10 w-full text-left text-label-md font-medium text-[#1A1917]"
                      >
                        <UserPlus className="size-3.5 shrink-0 text-[#1A1917]" />
                        Invite by email
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Dialog open={inviteByEmailOpen} onOpenChange={setInviteByEmailOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite by email</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  <ReviewersInviteList documentId={documentId} compact />
                </div>
              </DialogContent>
            </Dialog>

            {/* Bottom Utility Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#EFEBE3]">
              <div className="border-t border-[#D9D3C7]" />
              {isGuest ? (
                <div className="p-4">
                  <p className="text-body-sm text-[#6B6560]">
                    Create a free account to upload your own documents, invite
                    collaborators, and access everything from one place.
                  </p>
                  <Link
                    href={`/auth/signin?callbackUrl=${encodeURIComponent(`/documents/${documentId}`)}`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#B5763A] px-3 py-2 text-label-md font-medium text-white transition hover:bg-[#9E6530]"
                  >
                    Create account
                  </Link>
                  {/* callbackUrl returns the guest to this document after Discord OAuth — critical for UX */}
                </div>
              ) : (
                <div className="p-2">
                  {utilityNavItems.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group flex h-9 items-center gap-3 rounded px-3 text-[#6B6560] transition-all duration-150 hover:bg-[#E3DDD4] hover:text-[#1A1917]"
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="text-label-md truncate">{item.title}</span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="border-t border-[#D9D3C7]" />
              {user && (
                <div className="p-2">
                  <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-all duration-150 hover:bg-[#E3DDD4]"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#D9D3C7] text-xs font-medium text-[#1A1917]">
                          {getInitials(user.name, user.email)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-label-md truncate text-[#1A1917]">
                            {user.name ?? "User"}
                          </p>
                          <p className="text-caption truncate text-[#9E9892]">
                            {user.email ?? ""}
                          </p>
                        </div>
                        <ChevronUp className="size-4 shrink-0 text-[#6B6560]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="start"
                      sideOffset={8}
                      className="w-48 rounded-md border border-[#D9D3C7] bg-[#F7F4EF] p-2 shadow-[0_8px_24px_rgba(26,25,23,0.14)]"
                    >
                      <Link
                        href="/profile"
                        className="flex h-8 items-center gap-2 rounded px-4 text-body-sm text-[#1A1917] transition-colors hover:bg-[#EFEBE3]"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="size-4" />
                        Profile
                      </Link>
                      <Link
                        href="#"
                        className="flex h-8 items-center gap-2 rounded px-4 text-body-sm text-[#1A1917] transition-colors hover:bg-[#EFEBE3]"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <CreditCard className="size-4" />
                        Billing
                      </Link>
                      <div className="my-1 border-t border-[#D9D3C7]" />
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex h-8 w-full items-center gap-2 rounded px-4 text-body-sm text-[#A63D2F] transition-colors hover:bg-[#EFEBE3]"
                      >
                        <LogOut className="size-4" />
                        Sign Out
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </TooltipProvider>
  );
}
