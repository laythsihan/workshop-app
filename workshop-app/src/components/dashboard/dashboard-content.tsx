"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FilePlus2, FileText, Trash2, UserPlus, Copy, Check, MessageSquare, ChevronDown, ChevronLeft, ChevronRight, List, LayoutGrid, X } from "lucide-react";
import { api } from "workshop/trpc/react";
import { Button } from "workshop/components/ui/button";
import { AvatarStack } from "workshop/components/ui/avatar-stack";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "workshop/components/ui/popover";
import { GENRE_OPTIONS, getGenreLabel } from "workshop/lib/genre";
import { cn } from "workshop/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "workshop/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "workshop/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "workshop/components/ui/tabs";
import { Input } from "workshop/components/ui/input";
import { UploadForm } from "workshop/components/documents/upload-form";
import { ReviewersInviteList } from "workshop/components/documents/reviewers-invite-list";

function formatDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatFileType(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "DOCX",
    "text/plain": "TXT",
  };
  return map[mimeType] ?? "File";
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { dot: string; label: string }> = {
    DRAFT: { dot: "bg-[#C4933F]", label: "text-[#8A6425]" },
    IN_REVIEW: { dot: "bg-[#4A7FA5]", label: "text-[#2E5F80]" },
    COMPLETED: { dot: "bg-[#4A9B6F]", label: "text-[#2E7050]" },
  };
  const colors = variants[status] ?? { dot: "bg-[#9E9892]", label: "text-[#6B6560]" };
  
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-1.5 shrink-0 rounded-full ${colors.dot}`} />
      <span className={`text-label-sm ${colors.label}`}>
        {status.replace("_", " ")}
      </span>
    </span>
  );
}

function GenreDropdown({
  genre,
  onGenreChange,
  disabled,
}: {
  genre: string | null;
  onGenreChange: (newGenre: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = getGenreLabel(genre);
  const isUnclassified = !genre;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={cn(
            "text-body-sm transition-colors hover:text-[#6B6560]",
            isUnclassified ? "text-[#B8B0A4]" : "text-[#6B6560]",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-48 rounded-md border border-[#D9D3C7] bg-[#F7F4EF] p-2 shadow-[0_4px_12px_rgba(26,25,23,0.10)]"
        onClick={(e) => e.stopPropagation()}
      >
        {GENRE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onGenreChange(option.value);
              setOpen(false);
            }}
            className={cn(
              "flex h-8 w-full items-center justify-between rounded px-3 text-body-sm text-[#1A1917] transition-colors hover:bg-[#EFEBE3]",
              genre === option.value && "bg-[#EFEBE3]"
            )}
          >
            {option.label}
            {genre === option.value && (
              <Check className="size-4 text-[#B5763A]" />
            )}
          </button>
        ))}
        <div className="my-1 border-t border-[#D9D3C7]" />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onGenreChange(null);
            setOpen(false);
          }}
          className="flex h-8 w-full items-center rounded px-3 text-body-sm text-[#9E9892] transition-colors hover:bg-[#EFEBE3]"
        >
          Clear genre
        </button>
      </PopoverContent>
    </Popover>
  );
}

type Collaborator = {
  id: string;
  name: string | null;
  email: string | null;
};

function DocumentRow({
  id,
  title,
  filename,
  status,
  mimeType,
  wordCount,
  genre,
  createdAt,
  dueDate,
  commentCount,
  collaborators,
  onDelete,
  onShare,
  onGenreChange,
  isDeleting,
  isUpdating,
}: {
  id: string;
  title: string | null;
  filename: string;
  status: string;
  mimeType: string;
  wordCount: number | null;
  genre: string | null;
  createdAt: Date | string;
  dueDate: Date | string | null;
  commentCount: number;
  collaborators: Collaborator[];
  onDelete: () => void;
  onShare: () => void;
  onGenreChange: (newGenre: string | null) => void;
  isDeleting?: boolean;
  isUpdating?: boolean;
}) {
  const displayName = (title ?? "").trim() || filename;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileType = formatFileType(mimeType);
  const wordStr = wordCount != null ? `${wordCount.toLocaleString()} words` : null;
  const dueDateStr = status === "IN_REVIEW" && dueDate ? `Due ${formatDateTime(dueDate)}` : null;
  
  const metaParts = [fileType, wordStr, dueDateStr, formatDateTime(createdAt)].filter(Boolean);

  return (
    <>
      <Link
        href={`/documents/${id}`}
        className="mb-3 last:mb-0 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-[#D9D3C7] bg-[#FDFBF8] px-6 py-5 shadow-[0_1px_4px_rgba(26,25,23,0.06)] transition-[border-color,box-shadow] duration-150 ease-out hover:border-[#B8B0A4] hover:shadow-[0_3px_10px_rgba(26,25,23,0.10)]"
      >
        {/* Left Column */}
        <div className="min-w-0 flex-1">
          {/* Row 1: Title + Status */}
          <div className="flex items-center gap-3">
            <span className="text-display-sm truncate text-foreground">
              {displayName}
            </span>
            <StatusBadge status={status} />
          </div>
          
          {/* Row 2: Genre */}
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <GenreDropdown
              genre={genre}
              onGenreChange={onGenreChange}
              disabled={isUpdating}
            />
          </div>
          
          {/* Row 3: Metadata */}
          <div className="mt-1 flex items-center gap-2 text-body-sm text-[#9E9892]">
            <span>{metaParts.join(" · ")}</span>
            {commentCount > 0 && (
              <span className="flex items-center gap-1">
                <span>·</span>
                <MessageSquare className="size-3.5" />
                <span>{commentCount}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div
          className="flex w-40 shrink-0 flex-col items-end justify-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Collaborator avatars */}
          <AvatarStack collaborators={collaborators} max={3} />
          
          {/* Action buttons - always visible */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShare();
              }}
              className="flex size-7 items-center justify-center rounded text-[#9E9892] transition-colors hover:bg-[#E3DDD4] hover:text-[#1A1917]"
              aria-label="Share document"
            >
              <UserPlus className="size-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmOpen(true);
              }}
              disabled={isDeleting}
              className="flex size-7 items-center justify-center rounded text-[#9E9892] transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete document"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </Link>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{displayName}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                onDelete();
                setConfirmOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InvitedDocumentRow({
  id,
  title,
  filename,
  status,
  mimeType,
  wordCount,
  genre,
  createdAt,
  dueDate,
  ownerName,
  commentCount,
  collaborators,
}: {
  id: string;
  title: string | null;
  filename: string;
  status: string;
  mimeType: string;
  wordCount: number | null;
  genre: string | null;
  createdAt: Date | string;
  dueDate: Date | string | null;
  ownerName: string | null;
  commentCount: number;
  collaborators: Collaborator[];
}) {
  const fileType = formatFileType(mimeType);
  const wordStr = wordCount != null ? `${wordCount.toLocaleString()} words` : null;
  const dueDateStr = status === "IN_REVIEW" && dueDate ? `Due ${formatDateTime(dueDate)}` : null;
  const metaParts = [
    ownerName ? `From ${ownerName}` : null,
    fileType,
    wordStr,
    dueDateStr,
    formatDateTime(createdAt),
  ].filter(Boolean);

  return (
    <Link
      href={`/documents/${id}`}
      className="mb-3 last:mb-0 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-[#D9D3C7] bg-[#FDFBF8] px-6 py-5 shadow-[0_1px_4px_rgba(26,25,23,0.06)] transition-[border-color,box-shadow] duration-150 ease-out hover:border-[#B8B0A4] hover:shadow-[0_3px_10px_rgba(26,25,23,0.10)]"
    >
      {/* Left Column */}
      <div className="min-w-0 flex-1">
        {/* Row 1: Title + Status */}
        <div className="flex items-center gap-3">
          <span className="text-display-sm truncate text-foreground">
            {(title ?? "").trim() || filename}
          </span>
          <StatusBadge status={status} />
        </div>
        
        {/* Row 2: Genre (read-only for invited docs) */}
        <p className={cn(
          "mt-1 text-body-sm",
          genre ? "text-[#6B6560]" : "text-[#B8B0A4]"
        )}>
          {getGenreLabel(genre)}
        </p>
        
        {/* Row 3: Metadata */}
        <div className="mt-1 flex items-center gap-2 text-body-sm text-[#9E9892]">
          <span>{metaParts.join(" · ")}</span>
          {commentCount > 0 && (
            <span className="flex items-center gap-1">
              <span>·</span>
              <MessageSquare className="size-3.5" />
              <span>{commentCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Column */}
      <div className="flex w-40 shrink-0 items-center justify-end">
        <AvatarStack collaborators={collaborators} max={3} />
      </div>
    </Link>
  );
}

function DocumentGridCard({
  id,
  title,
  filename,
  status,
  mimeType,
  wordCount,
  genre,
  onDelete,
  onShare,
  onGenreChange,
  isDeleting,
  isUpdating,
}: {
  id: string;
  title: string | null;
  filename: string;
  status: string;
  mimeType: string;
  wordCount: number | null;
  genre: string | null;
  onDelete: () => void;
  onShare: () => void;
  onGenreChange: (newGenre: string | null) => void;
  isDeleting?: boolean;
  isUpdating?: boolean;
}) {
  const displayName = (title ?? "").trim() || filename;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileType = formatFileType(mimeType);
  const wordStr = wordCount != null ? `${wordCount.toLocaleString()} words` : null;

  return (
    <>
      <Link
        href={`/documents/${id}`}
        className="group relative flex min-h-[140px] cursor-pointer flex-col justify-between overflow-hidden rounded-lg border border-[#D9D3C7] bg-[#FDFBF8] p-4 shadow-[0_1px_4px_rgba(26,25,23,0.06)] transition-[border-color,box-shadow] duration-150 ease-out hover:border-[#B8B0A4] hover:shadow-[0_3px_10px_rgba(26,25,23,0.10)]"
      >
        {/* Main content */}
        <div className="min-w-0">
          <div className="mb-2 flex items-start gap-2">
            <StatusBadge status={status} />
          </div>
          <h3 className="text-display-sm line-clamp-2 text-foreground">
            {displayName}
          </h3>
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <GenreDropdown
              genre={genre}
              onGenreChange={onGenreChange}
              disabled={isUpdating}
            />
          </div>
        </div>
        
        {/* Bottom info */}
        <div className="mt-2 text-body-sm text-[#9E9892]">
          {[fileType, wordStr].filter(Boolean).join(" · ")}
        </div>

        {/* Hover overlay with actions */}
        <div
          className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-end gap-1 bg-gradient-to-t from-[#FDFBF8] via-[#FDFBF8] to-transparent px-3 py-2 transition-transform duration-150 group-hover:translate-y-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShare();
            }}
            className="flex size-7 items-center justify-center rounded text-[#9E9892] transition-colors hover:bg-[#E3DDD4] hover:text-[#1A1917]"
            aria-label="Share document"
          >
            <UserPlus className="size-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            disabled={isDeleting}
            className="flex size-7 items-center justify-center rounded text-[#9E9892] transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete document"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </Link>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{displayName}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                onDelete();
                setConfirmOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InvitedDocumentGridCard({
  id,
  title,
  filename,
  status,
  mimeType,
  wordCount,
  genre,
}: {
  id: string;
  title: string | null;
  filename: string;
  status: string;
  mimeType: string;
  wordCount: number | null;
  genre: string | null;
}) {
  const displayName = (title ?? "").trim() || filename;
  const fileType = formatFileType(mimeType);
  const wordStr = wordCount != null ? `${wordCount.toLocaleString()} words` : null;

  return (
    <Link
      href={`/documents/${id}`}
      className="flex min-h-[140px] cursor-pointer flex-col justify-between rounded-lg border border-[#D9D3C7] bg-[#FDFBF8] p-4 shadow-[0_1px_4px_rgba(26,25,23,0.06)] transition-[border-color,box-shadow] duration-150 ease-out hover:border-[#B8B0A4] hover:shadow-[0_3px_10px_rgba(26,25,23,0.10)]"
    >
      {/* Main content */}
      <div className="min-w-0">
        <div className="mb-2 flex items-start gap-2">
          <StatusBadge status={status} />
        </div>
        <h3 className="text-display-sm line-clamp-2 text-foreground">
          {displayName}
        </h3>
        <p className={cn(
          "mt-1 text-body-sm",
          genre ? "text-[#6B6560]" : "text-[#B8B0A4]"
        )}>
          {getGenreLabel(genre)}
        </p>
      </div>
      
      {/* Bottom info */}
      <div className="mt-2 text-body-sm text-[#9E9892]">
        {[fileType, wordStr].filter(Boolean).join(" · ")}
      </div>
    </Link>
  );
}

type Invitation = {
  user: { id: string; name: string | null; email: string | null } | null;
};

type MyDoc = {
  id: string;
  title: string | null;
  filename: string;
  status: string;
  mimeType: string;
  wordCount: number | null;
  genre: string | null;
  createdAt: Date | string;
  dueDate: Date | string | null;
  _count: { comments: number };
  invitations: Invitation[];
};

type ReviewDoc = {
  id: string;
  title: string | null;
  filename: string;
  status: string;
  mimeType: string;
  wordCount: number | null;
  genre: string | null;
  createdAt: Date | string;
  dueDate: Date | string | null;
  owner: { id: string; name: string | null; email: string | null } | null;
  _count: { comments: number };
  invitations: Invitation[];
};

export function DashboardContent({
  myDocs,
  reviewDocs,
}: {
  myDocs: MyDoc[];
  reviewDocs: ReviewDoc[];
}) {
  const router = useRouter();
  const deleteMutation = api.document.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted", { closeButton: true });
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to delete document", { closeButton: true });
    },
  });

  const getShareLinkMutation = api.document.getShareLink.useMutation({
    onError: (err) => {
      toast.error(err.message ?? "Failed to get share link", { closeButton: true });
    },
  });

  const updateMutation = api.document.update.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update document", { closeButton: true });
    },
  });

  const handleGenreChange = (docId: string, newGenre: string | null) => {
    updateMutation.mutate({ 
      id: docId, 
      genre: newGenre as typeof GENRE_OPTIONS[number]["value"] | null 
    });
  };

  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "DRAFT" | "IN_REVIEW" | "COMPLETED">("all");
  const [sortBy, setSortBy] = useState<"lastModified" | "dateCreated" | "title" | "wordCount" | "dueDate">("lastModified");
  const [sortOpen, setSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [myDocsPage, setMyDocsPage] = useState(1);
  const [reviewDocsPage, setReviewDocsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const searchParams = useSearchParams();
  const showWelcomeParam = searchParams.get("welcome") === "1";
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState(true);

  useEffect(() => {
    if (showWelcomeParam && typeof window !== "undefined") {
      const dismissed = localStorage.getItem("workshop_welcome_banner_dismissed");
      setWelcomeBannerDismissed(Boolean(dismissed));
    }
  }, [showWelcomeParam]);

  const dismissWelcomeBanner = () => {
    setWelcomeBannerDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("workshop_welcome_banner_dismissed", "1");
    }
  };

  const showWelcomeBanner = showWelcomeParam && !welcomeBannerDismissed;

  // Load view preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dashboard-view-preference");
    if (saved === "list" || saved === "grid") {
      setViewMode(saved);
    }
  }, []);

  // Save view preference to localStorage
  const handleViewChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("dashboard-view-preference", mode);
  };

  // Reset page when filter or sort changes
  useEffect(() => {
    setMyDocsPage(1);
    setReviewDocsPage(1);
  }, [statusFilter, sortBy]);

  const sortOptions = [
    { value: "lastModified", label: "Last modified" },
    { value: "dateCreated", label: "Date created" },
    { value: "title", label: "Title A–Z" },
    { value: "wordCount", label: "Word count" },
    { value: "dueDate", label: "Due date" },
  ] as const;

  const sortDocs = useCallback(
    <T extends { title: string | null; filename: string; wordCount: number | null; createdAt: Date | string; dueDate: Date | string | null }>(docs: T[]): T[] => {
      return [...docs].sort((a, b) => {
        switch (sortBy) {
          case "lastModified":
          case "dateCreated": {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          }
          case "title": {
            const titleA = (a.title ?? a.filename).toLowerCase();
            const titleB = (b.title ?? b.filename).toLowerCase();
            return titleA.localeCompare(titleB);
          }
          case "wordCount": {
            const countA = a.wordCount ?? 0;
            const countB = b.wordCount ?? 0;
            return countB - countA;
          }
          case "dueDate": {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          default:
            return 0;
        }
      });
    },
    [sortBy]
  );

  const filteredMyDocs = useMemo(() => {
    const filtered = statusFilter === "all"
      ? myDocs
      : myDocs.filter((d) => d.status === statusFilter);
    return sortDocs(filtered);
  }, [myDocs, statusFilter, sortDocs]);

  const filteredReviewDocs = useMemo(() => {
    const filtered = statusFilter === "all"
      ? reviewDocs
      : reviewDocs.filter((d) => d.status === statusFilter);
    return sortDocs(filtered);
  }, [reviewDocs, statusFilter, sortDocs]);

  // Pagination calculations
  const myDocsTotalPages = Math.ceil(filteredMyDocs.length / ITEMS_PER_PAGE);
  const reviewDocsTotalPages = Math.ceil(filteredReviewDocs.length / ITEMS_PER_PAGE);
  
  const paginatedMyDocs = useMemo(() => {
    const start = (myDocsPage - 1) * ITEMS_PER_PAGE;
    return filteredMyDocs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMyDocs, myDocsPage]);

  const paginatedReviewDocs = useMemo(() => {
    const start = (reviewDocsPage - 1) * ITEMS_PER_PAGE;
    return filteredReviewDocs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReviewDocs, reviewDocsPage]);

  const fullShareUrl =
    shareDocId && getShareLinkMutation.data
      ? `${typeof window !== "undefined" ? window.location.origin : ""}${getShareLinkMutation.data.shareUrl}`
      : null;

  const handleShareClick = (docId: string) => {
    setShareDocId(docId);
    setShareOpen(true);
    getShareLinkMutation.mutate({ id: docId });
  };

  const copyShareLink = () => {
    if (!fullShareUrl) return;
    void navigator.clipboard.writeText(fullShareUrl).then(() => {
      setShareCopied(true);
      toast.success("Link copied to clipboard", { closeButton: true });
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const closeShareDialog = () => {
    setShareOpen(false);
    setShareDocId(null);
    getShareLinkMutation.reset();
  };

  const getCollaborators = (invitations: Invitation[]): Collaborator[] => {
    return invitations
      .filter((inv): inv is { user: NonNullable<Invitation["user"]> } => inv.user !== null)
      .map((inv) => inv.user);
  };

  const getPageNumbers = (currentPage: number, totalPages: number): (number | "ellipsis")[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages: (number | "ellipsis")[] = [];
    
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "ellipsis", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages);
    }
    
    return pages;
  };

  const PaginationControls = ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => {
    if (totalPages <= 1) return null;

    const pageNumbers = totalPages > 3 ? getPageNumbers(currentPage, totalPages) : null;

    return (
      <div className="mt-8 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 items-center gap-1 rounded px-3 text-label-md text-[#6B6560] transition-colors hover:bg-[#EFEBE3] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-4" />
          Previous
        </button>

        {pageNumbers ? (
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, idx) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-[#6B6560]">
                  ···
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={`flex size-8 items-center justify-center rounded text-body-sm transition-colors ${
                    currentPage === page
                      ? "border border-[#D9D3C7] bg-[#E3DDD4] text-[#1A1917]"
                      : "text-[#6B6560] hover:bg-[#EFEBE3]"
                  }`}
                >
                  {page}
                </button>
              )
            )}
          </div>
        ) : (
          <span className="px-3 text-body-sm text-[#6B6560]">
            Page {currentPage} of {totalPages}
          </span>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-8 items-center gap-1 rounded px-3 text-label-md text-[#6B6560] transition-colors hover:bg-[#EFEBE3] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
  };

  return (
    <>
    {showWelcomeBanner && (
      <div className="mb-6 flex items-center justify-between gap-4 rounded-[4px] border-l-4 border-[#B5763A] bg-[rgba(181,118,58,0.08)] px-4 py-3">
        <p className="text-body-sm text-[#1A1917]">
          Welcome to Workshop. Upload your first document to get started.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              dismissWelcomeBanner();
              setUploadOpen(true);
            }}
            className="rounded-[4px]"
          >
            Upload document
          </Button>
          <button
            type="button"
            onClick={dismissWelcomeBanner}
            className="flex size-8 items-center justify-center rounded text-[#9E9892] transition-colors hover:bg-[rgba(181,118,58,0.12)] hover:text-[#6B6560]"
            aria-label="Dismiss welcome banner"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    )}
    <Tabs defaultValue="mine" className="w-full">
      <div className="flex items-center justify-between">
        <TabsList className="h-10 bg-muted/60 p-1">
          <TabsTrigger value="mine" className="rounded-md px-4">My documents</TabsTrigger>
          <TabsTrigger value="reviewing" className="rounded-md px-4">Invited to review</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleViewChange("list")}
              className={`flex size-7 items-center justify-center rounded transition-all duration-150 ${
                viewMode === "list"
                  ? "bg-[#E3DDD4] text-[#1A1917]"
                  : "text-[#9E9892] hover:text-[#1A1917]"
              }`}
              aria-label="List view"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("grid")}
              className={`flex size-7 items-center justify-center rounded transition-all duration-150 ${
                viewMode === "grid"
                  ? "bg-[#E3DDD4] text-[#1A1917]"
                  : "text-[#9E9892] hover:text-[#1A1917]"
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <span className="text-label-sm text-[#6B6560]">Sort by</span>
            <Popover open={sortOpen} onOpenChange={setSortOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-label-md text-[#1A1917] transition-colors hover:text-[#6B6560]"
                >
                  {sortOptions.find((o) => o.value === sortBy)?.label}
                  <ChevronDown className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-44 rounded-md border border-[#D9D3C7] bg-[#F7F4EF] p-2 shadow-[0_4px_12px_rgba(26,25,23,0.10)]"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSortBy(option.value);
                      setSortOpen(false);
                    }}
                    className="flex h-8 w-full items-center justify-between rounded px-4 text-body-sm text-[#1A1917] transition-colors hover:bg-[#EFEBE3]"
                  >
                    {option.label}
                    {sortBy === option.value && (
                      <Check className="size-4 text-[#B5763A]" />
                    )}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <Button
            size="sm"
            onClick={() => setUploadOpen(true)}
            className="rounded-lg shadow-sm"
          >
            <FilePlus2 className="mr-2 size-4" />
            Upload document
          </Button>
        </div>
      </div>

      <TabsContent value="mine" className="mt-6">
        <div className="min-w-[600px]">
          <div className="min-h-[280px]">
            {myDocs.length > 0 ? (
              <>
                <div className="mb-5 flex flex-wrap gap-1.5">
                  <span className="sr-only">Filter by status:</span>
                  {(["all", "DRAFT", "IN_REVIEW", "COMPLETED"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        statusFilter === s
                          ? "bg-foreground text-background shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {s === "all" ? "All" : s.replace("_", " ")}
                    </button>
                  ))}
                </div>
                {filteredMyDocs.length > 0 ? (
                  <>
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                        {paginatedMyDocs.map((doc) => (
                          <DocumentGridCard
                            key={doc.id}
                            id={doc.id}
                            title={doc.title}
                            filename={doc.filename}
                            status={doc.status}
                            mimeType={doc.mimeType}
                            wordCount={doc.wordCount}
                            genre={doc.genre}
                            onDelete={() => deleteMutation.mutate({ id: doc.id })}
                            onShare={() => handleShareClick(doc.id)}
                            onGenreChange={(newGenre) => handleGenreChange(doc.id, newGenre)}
                            isDeleting={deleteMutation.isPending}
                            isUpdating={updateMutation.isPending}
                          />
                        ))}
                      </div>
                    ) : (
                      <div>
                        {paginatedMyDocs.map((doc) => (
                          <DocumentRow
                            key={doc.id}
                            id={doc.id}
                            title={doc.title}
                            filename={doc.filename}
                            status={doc.status}
                            mimeType={doc.mimeType}
                            wordCount={doc.wordCount}
                            genre={doc.genre}
                            createdAt={doc.createdAt}
                            dueDate={doc.dueDate}
                            commentCount={doc._count.comments}
                            collaborators={getCollaborators(doc.invitations)}
                            onDelete={() => deleteMutation.mutate({ id: doc.id })}
                            onShare={() => handleShareClick(doc.id)}
                            onGenreChange={(newGenre) => handleGenreChange(doc.id, newGenre)}
                            isDeleting={deleteMutation.isPending}
                            isUpdating={updateMutation.isPending}
                          />
                        ))}
                      </div>
                    )}
                    <PaginationControls
                      currentPage={myDocsPage}
                      totalPages={myDocsTotalPages}
                      onPageChange={setMyDocsPage}
                    />
                  </>
                ) : statusFilter !== "all" ? (
                  <div className="flex h-[180px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No {statusFilter.replace("_", " ").toLowerCase()} documents.
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-16">
                <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-muted">
                  <FilePlus2 className="size-6 text-muted-foreground" />
                </div>
                <p className="mb-1.5 text-base font-medium text-foreground">
                  No documents yet
                </p>
                <p className="mb-5 max-w-[280px] text-center text-sm text-muted-foreground">
                  Upload a document to get started and invite reviewers for feedback.
                </p>
                <Button
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                  className="rounded-lg shadow-sm"
                >
                  <FilePlus2 className="mr-2 size-4" />
                  Upload document
                </Button>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="reviewing" className="mt-6">
        <div className="min-w-[600px]">
          <div className="min-h-[280px]">
            {reviewDocs.length > 0 ? (
              <>
                <div className="mb-5 flex flex-wrap gap-1.5">
                  <span className="sr-only">Filter by status:</span>
                  {(["all", "IN_REVIEW", "COMPLETED"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        statusFilter === s
                          ? "bg-foreground text-background shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {s === "all" ? "All" : s.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <div className="min-h-[180px]">
                  {filteredReviewDocs.length > 0 ? (
                    <>
                      {viewMode === "grid" ? (
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                          {paginatedReviewDocs.map((doc) => (
                            <InvitedDocumentGridCard
                              key={doc.id}
                              id={doc.id}
                              title={doc.title}
                              filename={doc.filename}
                              status={doc.status}
                              mimeType={doc.mimeType}
                              wordCount={doc.wordCount}
                              genre={doc.genre}
                            />
                          ))}
                        </div>
                      ) : (
                        paginatedReviewDocs.map((doc) => (
                          <InvitedDocumentRow
                            key={doc.id}
                            id={doc.id}
                            title={doc.title}
                            filename={doc.filename}
                            status={doc.status}
                            mimeType={doc.mimeType}
                            wordCount={doc.wordCount}
                            genre={doc.genre}
                            createdAt={doc.createdAt}
                            dueDate={doc.dueDate}
                            ownerName={doc.owner?.name ?? null}
                            commentCount={doc._count.comments}
                            collaborators={getCollaborators(doc.invitations)}
                          />
                        ))
                      )}
                      <PaginationControls
                        currentPage={reviewDocsPage}
                        totalPages={reviewDocsTotalPages}
                        onPageChange={setReviewDocsPage}
                      />
                    </>
                  ) : statusFilter !== "all" ? (
                    <div className="flex h-[180px] items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        No {statusFilter.replace("_", " ").toLowerCase()} documents to review.
                      </p>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-16">
                <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-muted">
                  <FileText className="size-6 text-muted-foreground" />
                </div>
                <p className="mb-1.5 text-base font-medium text-foreground">
                  No documents to review
                </p>
                <p className="max-w-[280px] text-center text-sm text-muted-foreground">
                  Documents shared with you for review will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>

    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription className="sr-only">
            Add a new document to share with reviewers
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <UploadForm
            onSuccess={() => {
              setUploadOpen(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={shareOpen} onOpenChange={(open) => !open && closeShareDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription className="sr-only">
            Copy the link or invite reviewers by email
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="link" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Copy link</TabsTrigger>
            <TabsTrigger value="email">Invite by email</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Anyone with this link can request access to review. They&apos;ll need to sign in.
            </p>
            {getShareLinkMutation.isPending ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : fullShareUrl ? (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={fullShareUrl}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyShareLink}
                  className="shrink-0"
                >
                  {shareCopied ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            ) : getShareLinkMutation.isError ? (
              <p className="text-sm text-destructive">
                {getShareLinkMutation.error.message}
              </p>
            ) : null}
          </TabsContent>
          <TabsContent value="email" className="mt-4">
            {shareDocId && (
              <ReviewersInviteList documentId={shareDocId} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    </>
  );
}
