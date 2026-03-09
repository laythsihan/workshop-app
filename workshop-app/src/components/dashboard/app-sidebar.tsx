"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  FolderOpen,
  FileText,
  Settings,
  HelpCircle,
  MoreHorizontal,
  LogOut,
  User,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  Clock,
  Pencil,
  Trash2,
  ExternalLink,
  Loader,
  Upload,
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

type AppSidebarProps = {
  user: { name: string | null; email: string | null } | null;
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

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function RailIconButton({
  icon: Icon,
  tooltip,
  onClick,
  href,
  isActive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  onClick?: () => void;
  href?: string;
  isActive?: boolean;
}) {
  const buttonContent = (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded text-[#9E9892] transition-all duration-150",
        "hover:bg-[#E3DDD4] hover:text-[#1A1917]",
        isActive && "bg-[#E3DDD4] text-[#B5763A]"
      )}
    >
      <Icon className="size-4" />
    </div>
  );

  const trigger = href ? (
    <Link href={href}>{buttonContent}</Link>
  ) : (
    <button type="button" onClick={onClick}>
      {buttonContent}
    </button>
  );

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

const ACTIVITY_SKELETON_WIDTHS = ["80%", "65%", "75%", "55%"];

function GlobalActivityFeed() {
  const {
    data,
    isLoading: activityLoading,
    isError: activityError,
  } = api.activity.recentForUser.useQuery(undefined);

  if (activityLoading) {
    return (
      <div className="space-y-2 px-4">
        {ACTIVITY_SKELETON_WIDTHS.map((w, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded bg-[#E3DDD4]"
            style={{ width: w }}
          />
        ))}
      </div>
    );
  }

  if (activityError) {
    return (
      <div className="px-4 py-4 text-center">
        <span className="text-caption text-[#9E9892]">Couldn&apos;t load collaborator activity</span>
      </div>
    );
  }

  const { items } = data ?? { items: [] };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="mb-2 size-4 text-[#9E9892]" />
        <span className="text-body-sm text-[#9E9892]">No collaborator activity yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item, index) => {
        const href = item.commentId
          ? `/documents/${item.documentId}?comment=${item.commentId}`
          : `/documents/${item.documentId}`;
        const isSystemUpload = item.type === "DOCUMENT_UPLOADED";
        const label = formatActivityLabel("global", item.type as ActivityTypeForLabel, {
          actorName: item.actorName,
          documentTitle: item.documentTitle,
          metadata: item.metadata,
          count: item.count,
        });
        return (
          <Link
            key={item.id}
            href={href}
            className={cn(
              "flex min-h-[32px] items-start gap-3 px-4 py-2 transition-colors duration-150 hover:bg-[#E3DDD4]",
              index < items.length - 1 && "border-b border-[#D9D3C7]"
            )}
          >
            {isSystemUpload ? (
              <Upload className="mt-0.5 size-4 shrink-0 text-[#9E9892]" />
            ) : item.actorImage ? (
              <Image
                src={item.actorImage}
                alt={item.actorName ?? "User"}
                width={24}
                height={24}
                className="size-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#E3DDD4] text-[10px] font-medium text-[#6B6560]">
                {(item.actorName ?? "?")
                  .trim()
                  .split(/\s+/)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p
                className="text-body-sm text-[#1A1917] leading-[1.4] line-clamp-2"
                title={label}
              >
                {label}
              </p>
              <p className="text-caption text-[#9E9892]">
                {formatRelativeTime(item.createdAt)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

type ProjectItem = {
  id: string;
  title: string | null;
  filename: string;
};

function ProjectListItem({
  project,
  onRename,
  onDelete,
}: {
  project: ProjectItem;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title ?? project.filename);

  const displayName = project.title ?? project.filename;

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== displayName) {
      onRename(project.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  if (isRenaming) {
    return (
      <div className="flex h-8 items-center gap-3 rounded px-3">
        <FileText className="size-3.5 shrink-0 text-[#9E9892]" />
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRenameSubmit();
            if (e.key === "Escape") {
              setRenameValue(displayName);
              setIsRenaming(false);
            }
          }}
          autoFocus
          className="h-6 flex-1 rounded border border-[#B5763A] bg-[#F7F4EF] px-2 text-body-sm text-[#1A1917] focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className="group flex h-8 items-center gap-3 rounded px-3 text-[#6B6560] transition-all duration-150 hover:bg-[#E3DDD4] hover:text-[#1A1917]">
      <FileText className="size-3.5 shrink-0 text-[#9E9892]" />
      <Link
        href={`/documents/${project.id}`}
        className="text-body-sm flex-1 truncate"
      >
        {displayName}
      </Link>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="hidden rounded p-0.5 hover:bg-[#D9D3C7] group-hover:block"
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={4}
          className="w-36 rounded-md border border-[#D9D3C7] bg-[#F7F4EF] p-1 shadow-[0_4px_12px_rgba(26,25,23,0.10)]"
        >
          <Link
            href={`/documents/${project.id}`}
            className="flex h-8 w-full items-center gap-2 rounded px-3 text-body-sm text-[#1A1917] transition-colors hover:bg-[#EFEBE3]"
            onClick={() => setMenuOpen(false)}
          >
            <ExternalLink className="size-3.5" />
            Open
          </Link>
          <button
            type="button"
            className="flex h-8 w-full items-center gap-2 rounded px-3 text-body-sm text-[#1A1917] transition-colors hover:bg-[#EFEBE3]"
            onClick={() => {
              setMenuOpen(false);
              setIsRenaming(true);
            }}
          >
            <Pencil className="size-3.5" />
            Rename
          </button>
          <button
            type="button"
            className="flex h-8 w-full items-center gap-2 rounded px-3 text-body-sm text-[#A63D2F] transition-colors hover:bg-[#EFEBE3]"
            onClick={() => {
              setMenuOpen(false);
              onDelete(project.id);
            }}
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function AppSidebar({ user: initialUser }: AppSidebarProps) {
  const pathname = usePathname();
  const utils = api.useUtils();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: userData } = api.user.me.useQuery();
  const user = userData
    ? { name: userData.displayName ?? userData.name, email: userData.email }
    : initialUser;

  const debouncedSearch = useDebounce(searchQuery, 300);
  const isSearching = searchQuery.trim().length > 0;

  const {
    data: searchResults,
    isFetching: searchFetching,
  } = api.document.search.useQuery(
    { query: debouncedSearch },
    { enabled: debouncedSearch.trim().length > 0 }
  );

  const updateDocumentMutation = api.document.update.useMutation({
    onSuccess: () => {
      void utils.activity.recentForUser.invalidate();
      void utils.document.listMine.invalidate();
      void utils.document.search.invalidate();
    },
  });

  const deleteDocumentMutation = api.document.delete.useMutation({
    onSuccess: () => {
      void utils.activity.recentForUser.invalidate();
      void utils.document.listMine.invalidate();
      void utils.document.search.invalidate();
    },
  });

  const handleRename = useCallback((id: string, newTitle: string) => {
    updateDocumentMutation.mutate({ id, title: newTitle });
  }, [updateDocumentMutation]);

  const handleDelete = useCallback((id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteDocumentMutation.mutate({ id });
    }
  }, [deleteDocumentMutation]);

  const sidebarWidth = isCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED_CLASS
    : SIDEBAR_WIDTH_EXPANDED_CLASS;

  const isActive = (href: string) => {
    if (href === "#") return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const showSearchLoader = isSearching && searchFetching && debouncedSearch === searchQuery;

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
            {/* Top section */}
            <div className="flex flex-col items-center pt-3">
              {/* Expand toggle */}
              <RailIconButton
                icon={ChevronRight}
                tooltip="Expand sidebar"
                onClick={() => setIsCollapsed(false)}
              />

              {/* My Projects */}
              <div className="mt-3">
                <RailIconButton
                  icon={FolderOpen}
                  tooltip="My Projects"
                  href="/dashboard"
                  isActive={isActive("/dashboard")}
                />
              </div>

              {/* Divider */}
              <div className="mx-auto my-2 w-6 border-t border-[#D9D3C7]" />

              {/* Collaborator Activity */}
              <RailIconButton
                icon={Clock}
                tooltip="Collaborator activity"
                href="/dashboard"
              />
            </div>

            {/* Bottom section - pinned */}
            <div className="mt-auto flex flex-col items-center pb-3">
              {/* Settings */}
              <RailIconButton
                icon={Settings}
                tooltip="Settings"
                href="/settings"
              />

              {/* Help */}
              <div className="mt-1">
                <RailIconButton
                  icon={HelpCircle}
                  tooltip="Help & Docs"
                  href="/help"
                  isActive={isActive("/help")}
                />
              </div>

              {/* User avatar */}
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
                        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
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
            {/* Logo / Wordmark Area */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#D9D3C7] px-4">
              <Link href="/dashboard" className="text-display-sm text-foreground opacity-100 transition-opacity duration-150">
                Workshop
              </Link>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="flex size-8 items-center justify-center rounded text-[#9E9892] transition-all duration-150 hover:bg-[#E3DDD4] hover:text-[#1A1917]"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="relative flex-1 overflow-y-auto pb-[180px] opacity-100 transition-opacity duration-150">
              {/* Search Bar */}
              <div className="p-4">
                <div
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-md border px-3 transition-all",
                    searchFocused
                      ? "border-[#B5763A] bg-[#F7F4EF]"
                      : "border-[#D9D3C7] bg-[#EDE9E2]"
                  )}
                >
                  {showSearchLoader ? (
                    <Loader className="size-3.5 shrink-0 animate-spin text-[#9E9892]" />
                  ) : (
                    <Search className="size-3.5 shrink-0 text-[#9E9892]" />
                  )}
                  <input
                    type="text"
                    placeholder="Search projects…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="h-full flex-1 bg-transparent text-caption text-[#1A1917] placeholder:text-[#9E9892] focus:outline-none"
                  />
                </div>
              </div>

              {/* My Projects Nav Item */}
              <nav className="px-2">
                <Link
                  href="/dashboard"
                  className={cn(
                    "group relative flex h-9 items-center gap-3 rounded px-3 transition-all duration-150",
                    isActive("/dashboard")
                      ? "bg-[#E3DDD4] text-[#1A1917]"
                      : "text-[#6B6560] hover:bg-[#E3DDD4] hover:text-[#1A1917]",
                    isActive("/dashboard") && "border-l-2 border-[#B5763A] -ml-0.5 pl-[10px]"
                  )}
                >
                  <FolderOpen
                    className={cn(
                      "size-4 shrink-0",
                      isActive("/dashboard") ? "text-[#B5763A]" : "text-[#6B6560] group-hover:text-[#1A1917]"
                    )}
                  />
                  <span className="text-label-md flex-1 truncate">My Projects</span>
                </Link>
              </nav>

              {/* Section Divider */}
              <div className="mx-4 my-4 border-t border-[#D9D3C7]" />

              {/* Collaborator activity (global) or Search Results */}
              <div className="px-2">
                {!isSearching && (
                  <div className="px-3 py-2">
                    <span className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
                      Collaborator Activity
                    </span>
                  </div>
                )}

                {!isSearching && <GlobalActivityFeed />}

                {isSearching && debouncedSearch && !searchFetching && (!searchResults || searchResults.length === 0) && (
                  <div className="px-3 py-8 text-center">
                    <span className="text-caption text-[#9E9892]">No projects found</span>
                  </div>
                )}
                {isSearching && searchResults && searchResults.length > 0 && (
                  <div className="space-y-0.5">
                    {searchResults.map((project) => (
                      <ProjectListItem
                        key={project.id}
                        project={project}
                        onRename={handleRename}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Utility Area - Absolutely Positioned */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#EFEBE3]">
              {/* Top Divider */}
              <div className="border-t border-[#D9D3C7]" />

              {/* Utility Links */}
              <div className="p-2">
                {utilityNavItems.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={cn(
                      "group flex h-9 items-center gap-3 rounded px-3 transition-all duration-150",
                      isActive(item.href)
                        ? "bg-[#E3DDD4] text-[#1A1917]"
                        : "text-[#6B6560] hover:bg-[#E3DDD4] hover:text-[#1A1917]"
                    )}
                  >
                    <item.icon className={cn(
                      "size-4 shrink-0",
                      isActive(item.href) ? "text-[#B5763A]" : ""
                    )} />
                    <span className="text-label-md truncate">{item.title}</span>
                  </Link>
                ))}
              </div>

              {/* Divider before user row */}
              <div className="border-t border-[#D9D3C7]" />

              {/* User Area */}
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
                        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
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
