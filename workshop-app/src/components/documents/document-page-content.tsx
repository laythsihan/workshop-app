"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { api } from "workshop/trpc/react";
import { Button } from "workshop/components/ui/button";
import { CommentsPanel } from "./comments-panel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "workshop/components/ui/tooltip";
import type { CommentForHighlight } from "./document-viewer";

const DocumentViewer = dynamic(
  () => import("./document-viewer").then((mod) => ({ default: mod.DocumentViewer })),
  { ssr: false }
);

const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 600;
const PANEL_DEFAULT_WIDTH = 400;
const PANEL_COLLAPSED_WIDTH = 48;
const STORAGE_KEY = "comments-panel-width";
const COMMENTS_PANEL_COLLAPSED_KEY = "comments_panel_collapsed";

function getCommentsPanelCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(COMMENTS_PANEL_COLLAPSED_KEY);
  if (stored === null) return false;
  return stored === "true";
}

function setCommentsPanelCollapsed(value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMMENTS_PANEL_COLLAPSED_KEY, value ? "true" : "false");
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    DRAFT: "border-amber-300 bg-amber-50 text-amber-800",
    IN_REVIEW: "border-blue-300 bg-blue-50 text-blue-800",
    COMPLETED: "border-green-300 bg-green-50 text-green-800",
  };
  const styles = variants[status] ?? "border-border text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${styles}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function RailIconButton({
  icon: Icon,
  tooltip,
  onClick,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  onClick?: () => void;
  badge?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="relative flex size-8 items-center justify-center rounded text-[#9E9892] transition-all duration-150 hover:bg-[#E3DDD4] hover:text-[#1A1917]"
        >
          <Icon className="size-4" />
          {badge !== undefined && badge > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-[#B5763A] px-1 text-label-sm font-medium text-[#F7F4EF]" style={{ height: '18px', fontSize: '11px' }}>
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        sideOffset={8}
        className="rounded bg-[#1A1917] px-2 py-1 text-caption text-[#EDE9E1]"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function useResizablePanel() {
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= PANEL_MIN_WIDTH && parsed <= PANEL_MAX_WIDTH) {
        setPanelWidth(parsed);
      }
    }
  }, []);

  const saveWidth = useCallback((width: number) => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setPanelWidth(PANEL_DEFAULT_WIDTH);
    saveWidth(PANEL_DEFAULT_WIDTH);
  }, [saveWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, newWidth));
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      saveWidth(panelWidth);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, panelWidth, saveWidth]);

  return {
    panelWidth,
    isResizing,
    isHoveringHandle,
    setIsHoveringHandle,
    handleMouseDown,
    handleDoubleClick,
  };
}

type Props = {
  documentId: string;
  fileUrl: string;
  mimeType: string;
  title?: string | null;
  documentStatus: string;
  isOwner: boolean;
  currentUserId: string;
  documentOwnerId: string;
  isGuest?: boolean;
};

export function DocumentPageContent({
  documentId,
  fileUrl,
  mimeType,
  title,
  documentStatus,
  isOwner,
  currentUserId,
  documentOwnerId,
  isGuest: _isGuest = false,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const [pendingComment, setPendingComment] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
    highlightRects?: { x: number; y: number; width: number; height: number }[];
  } | null>(null);

  const [isPanelOpen, setIsPanelOpenState] = useState(true);

  useEffect(() => {
    setIsPanelOpenState(!getCommentsPanelCollapsed());
  }, []);

  const setIsPanelOpen = useCallback((value: boolean) => {
    setIsPanelOpenState(value);
    setCommentsPanelCollapsed(!value);
  }, []);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [hasTypedComment, setHasTypedComment] = useState(false);
  const [navigateToComment, setNavigateToComment] = useState<{
    text: string;
    id: string;
  } | null>(null);
  
  const commentsScrollRef = useRef<HTMLDivElement>(null);
  
  const {
    panelWidth,
    isResizing,
    isHoveringHandle,
    setIsHoveringHandle,
    handleMouseDown,
    handleDoubleClick,
  } = useResizablePanel();
  
  useEffect(() => {
    if (commentsScrollRef.current) {
      commentsScrollRef.current.scrollTop = 0;
    }
  }, []);

  const { data: comments, isLoading: commentsLoading } = api.comment.list.useQuery(
    { documentId },
    { refetchOnWindowFocus: false }
  );

  const markCompleteMutation = api.document.markComplete.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const markReopenMutation = api.document.markReopen.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const createCommentMutation = api.comment.create.useMutation({
    onSuccess: () => {
      setPendingComment(null);
      void utils.comment.list.invalidate({ documentId });
    },
    onError: (error) => {
      console.error("[comment.create] Error:", error.message);
    },
  });

  const updateCommentMutation = api.comment.update.useMutation({
    onSuccess: () => {
      void utils.comment.list.invalidate({ documentId });
    },
    onError: (error) => {
      console.error("[comment.update] Error:", error.message);
    },
  });

  const deleteCommentMutation = api.comment.delete.useMutation({
    onSuccess: () => {
      void utils.comment.list.invalidate({ documentId });
    },
  });

  const handleEditComment = (commentId: string, content: string) => {
    updateCommentMutation.mutate({ id: commentId, content });
  };

  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate({ id: commentId });
  };

  const isCompleted = documentStatus === "COMPLETED";

  const totalComments = useMemo(() => {
    if (!comments) return 0;
    let count = comments.length;
    comments.forEach((c) => {
      if (c.replies) {
        count += c.replies.length;
      }
    });
    return count;
  }, [comments]);

  const uniqueUsers = useMemo(() => {
    if (!comments) return [];
    const userMap = new Map<string, { id: string; name: string | null }>();
    comments.forEach((c) => {
      if (c.user?.id) {
        userMap.set(c.user.id, { id: c.user.id, name: c.user.name });
      }
    });
    return Array.from(userMap.values());
  }, [comments]);

  const filteredComments = useMemo(() => {
    if (!comments) return undefined;
    if (!userFilter) return comments;
    return comments.filter((c) => c.user?.id === userFilter);
  }, [comments, userFilter]);

  const handleSelectionChange = (
    sel: { 
      text: string; 
      startOffset: number; 
      endOffset: number;
      highlightRects?: { x: number; y: number; width: number; height: number }[];
    } | null
  ) => {
    if (sel && !isCompleted) {
      setPendingComment(sel);
      if (!isPanelOpen) {
        setIsPanelOpen(true);
      }
    }
  };

  const handleSubmitComment = (content: string) => {
    if (!pendingComment) return;

    createCommentMutation.mutate({
      documentId,
      content,
      highlightedText: pendingComment.text,
      positionData: {
        startOffset: pendingComment.startOffset,
        endOffset: pendingComment.endOffset,
        selectedText: pendingComment.text,
      },
    });
  };

  const handleCommentClick = (comment: { id: string; highlightedText?: string | null }) => {
    if (comment.highlightedText) {
      setNavigateToComment({ text: comment.highlightedText, id: comment.id });
    }
  };

  const handleReply = (parentId: string, content: string) => {
    createCommentMutation.mutate({
      documentId,
      content,
      parentId,
    });
  };

  const currentPanelWidth = isPanelOpen ? panelWidth : PANEL_COLLAPSED_WIDTH;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative">
        {/* Document area - centered */}
        {/* On wide viewports (>=1100px), editor pushes to make room for panel */}
        {/* On narrow viewports (<1100px), panel overlays as drawer */}
        <div 
          className={`min-[1100px]:transition-[margin] min-[1100px]:duration-0 max-[1099px]:mr-12 ${
            isResizing ? "" : "min-[1100px]:transition-[margin] min-[1100px]:duration-200"
          }`}
          style={{ marginRight: isPanelOpen ? `${panelWidth}px` : `${PANEL_COLLAPSED_WIDTH}px` }}
        >
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status={documentStatus} />
              </div>
              <div className="flex items-center gap-2">
                {isOwner && (
                  <>
                    {isCompleted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markReopenMutation.mutate({ id: documentId })}
                        disabled={markReopenMutation.isPending}
                      >
                        <RotateCcw className="mr-2 size-4" />
                        Reopen
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markCompleteMutation.mutate({ id: documentId })}
                        disabled={markCompleteMutation.isPending}
                      >
                        <CheckCircle2 className="mr-2 size-4" />
                        Mark complete
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <DocumentViewer
                fileUrl={fileUrl}
                mimeType={mimeType}
                title={title}
                comments={comments as CommentForHighlight[] | null | undefined}
                onSelectionChange={handleSelectionChange}
                canComment={!isCompleted}
                pendingHighlight={pendingComment}
                onCancelComment={() => {
                  setPendingComment(null);
                  setHasTypedComment(false);
                }}
                navigateToComment={navigateToComment}
                onNavigateComplete={() => setNavigateToComment(null)}
                disableClickAway={hasTypedComment}
              />
            </div>
          </div>
        </div>

        {/* Right panel - Comments */}
        {/* 400px default expanded, 48px collapsed rail */}
        {/* On viewports <1100px, overlays as drawer with shadow */}
        <div
          data-comments-panel
          className={`fixed right-0 top-0 bottom-0 border-l border-[#D9D3C7] bg-[#EFEBE3] max-[1099px]:shadow-[-4px_0_24px_rgba(26,25,23,0.12)] ${
            isResizing ? "" : "transition-[width] duration-200 ease-out"
          }`}
          style={{ width: `${currentPanelWidth}px` }}
        >
          {isPanelOpen ? (
            <>
              {/* Resize handle - only in expanded state */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10"
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={() => setIsHoveringHandle(true)}
                onMouseLeave={() => setIsHoveringHandle(false)}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-0.5 bg-[#D9D3C7] transition-opacity duration-150 ${
                    isHoveringHandle || isResizing ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>

              <div className="flex h-full flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#D9D3C7] px-4 py-4">
                  <span className="text-display-sm text-[#1A1917]">Comments</span>
                  <button
                    type="button"
                    onClick={() => setIsPanelOpen(false)}
                    className="flex size-8 items-center justify-center rounded text-[#9E9892] transition-all duration-150 hover:bg-[#E3DDD4] hover:text-[#1A1917]"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                {/* User filter pills */}
                {uniqueUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-b border-[#D9D3C7] px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setUserFilter(null)}
                      className={`rounded-full px-3 py-1 text-label-sm font-medium transition-all duration-150 ${
                        userFilter === null
                          ? "border border-[#1A1917] bg-[#1A1917] text-[#F7F4EF]"
                          : "border border-[#D9D3C7] bg-[#E3DDD4] text-[#6B6560] hover:bg-[#D9D3C7]"
                      }`}
                    >
                      All
                    </button>
                    {uniqueUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setUserFilter(user.id)}
                        className={`rounded-full px-3 py-1 text-label-sm font-medium transition-all duration-150 ${
                          userFilter === user.id
                            ? "border border-[#1A1917] bg-[#1A1917] text-[#F7F4EF]"
                            : "border border-[#D9D3C7] bg-[#E3DDD4] text-[#6B6560] hover:bg-[#D9D3C7]"
                        }`}
                      >
                        {user.name ?? "Unknown"}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={commentsScrollRef} className="flex-1 overflow-y-auto">
                  <CommentsPanel
                    documentId={documentId}
                    comments={filteredComments ?? undefined}
                    isLoading={commentsLoading}
                    pendingComment={pendingComment}
                    onSubmitComment={handleSubmitComment}
                    onCancelComment={() => {
                      setPendingComment(null);
                      setHasTypedComment(false);
                    }}
                    onReply={handleReply}
                    onEdit={handleEditComment}
                    onDelete={handleDeleteComment}
                    isSubmitting={createCommentMutation.isPending}
                    isCompleted={isCompleted}
                    onCommentClick={handleCommentClick}
                    onTypingChange={setHasTypedComment}
                    currentUserId={currentUserId}
                    documentOwnerId={documentOwnerId}
                    canEditComments={true}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Collapsed Rail */
            <div className="flex h-full flex-col items-center pt-3">
              {/* Expand toggle */}
              <RailIconButton
                icon={ChevronLeft}
                tooltip="Expand comments"
                onClick={() => setIsPanelOpen(true)}
              />

              {/* Comments icon with badge */}
              <div className="mt-3">
                <RailIconButton
                  icon={MessageSquare}
                  tooltip={`Comments (${totalComments})`}
                  onClick={() => setIsPanelOpen(true)}
                  badge={totalComments}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
