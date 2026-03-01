"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Bold, Italic, MoreHorizontal } from "lucide-react";
import { Skeleton } from "workshop/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "workshop/components/ui/popover";

type RichTextInputProps = {
  value: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onFormattingChange?: (state: { isBold: boolean; isItalic: boolean }) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

type RichTextInputRef = {
  applyBold: () => void;
  applyItalic: () => void;
  focus: () => void;
};

function RichTextInput({
  value,
  onChange,
  onFocus,
  onBlur,
  onFormattingChange,
  placeholder,
  className = "",
  autoFocus,
  disabled,
  inputRef,
}: RichTextInputProps & { inputRef?: React.RefObject<RichTextInputRef | null> }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!value);
  const isInternalUpdate = useRef(false);

  const getContent = useCallback(() => {
    if (!editorRef.current) return "";
    return editorRef.current.innerHTML;
  }, []);

  const checkFormattingState = useCallback(() => {
    const isBold = document.queryCommandState("bold");
    const isItalic = document.queryCommandState("italic");
    onFormattingChange?.({ isBold, isItalic });
  }, [onFormattingChange]);

  const handleInput = useCallback(() => {
    if (isInternalUpdate.current) return;
    const content = getContent();
    const textContent = editorRef.current?.textContent ?? "";
    setIsEmpty(!textContent.trim());
    onChange(content);
    checkFormattingState();
  }, [getContent, onChange, checkFormattingState]);

  const applyFormatting = useCallback((command: "bold" | "italic") => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    handleInput();
    checkFormattingState();
  }, [handleInput, checkFormattingState]);

  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (selection && editorRef.current.contains(selection.anchorNode)) {
      checkFormattingState();
    }
  }, [checkFormattingState]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  useEffect(() => {
    if (inputRef) {
      (inputRef as React.MutableRefObject<RichTextInputRef | null>).current = {
        applyBold: () => applyFormatting("bold"),
        applyItalic: () => applyFormatting("italic"),
        focus: () => editorRef.current?.focus(),
      };
    }
  }, [inputRef, applyFormatting]);

  useEffect(() => {
    if (editorRef.current && value !== getContent()) {
      isInternalUpdate.current = true;
      editorRef.current.innerHTML = value;
      setIsEmpty(!editorRef.current.textContent?.trim());
      isInternalUpdate.current = false;
    }
  }, [value, getContent]);

  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`${className} outline-none`}
        style={{ minHeight: "80px" }}
        suppressContentEditableWarning
      />
      {isEmpty && placeholder && (
        <div className="pointer-events-none absolute left-0 top-0 text-[#9E9892]">
          {placeholder}
        </div>
      )}
    </div>
  );
}

type Comment = {
  id: string;
  content: string;
  highlightedText?: string | null;
  positionData?: unknown;
  createdAt: Date | string;
  updatedAt?: Date | string;
  user: {
    id: string;
    name: string | null;
    displayName?: string | null;
  };
  replies?: Comment[];
};

function getUserDisplayName(user: { name: string | null; displayName?: string | null }): string {
  const n = user.displayName?.trim() ?? user.name?.trim();
  return n && n.length > 0 ? n : "Unknown";
}

type Props = {
  documentId: string;
  comments?: Comment[] | null;
  isLoading?: boolean;
  pendingComment?: { text: string; startOffset: number; endOffset: number } | null;
  onSubmitComment: (content: string) => void;
  onCancelComment: () => void;
  onReply?: (parentId: string, content: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  isSubmitting?: boolean;
  isCompleted?: boolean;
  onCommentClick?: (comment: Comment) => void;
  onTypingChange?: (hasContent: boolean) => void;
  currentUserId?: string;
  documentOwnerId?: string;
  canEditComments?: boolean;
};

function getInitials(name: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0];
  const second = parts[1]?.[0];
  if (first && second) return (first + second).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, size = "md" }: { name: string | null; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "size-6" : "size-8";
  const textClasses = size === "sm" ? "text-caption font-medium" : "text-label-sm font-medium";
  
  return (
    <div className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full bg-[#E3DDD4] ${textClasses} text-[#6B6560]`}>
      {getInitials(name)}
    </div>
  );
}

function isEdited(createdAt: Date | string, updatedAt?: Date | string): boolean {
  if (!updatedAt) return false;
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  return updated - created > 1000;
}

function SmallButton({ 
  variant = "primary", 
  disabled, 
  onClick, 
  children 
}: { 
  variant?: "primary" | "ghost"; 
  disabled?: boolean; 
  onClick?: () => void; 
  children: React.ReactNode;
}) {
  const baseClasses = "h-7 rounded px-3 text-label-sm font-medium transition-all duration-150 ease-out";
  const variantClasses = variant === "primary"
    ? "bg-[#B5763A] text-[#F7F4EF] hover:bg-[#9E6530]"
    : "bg-transparent text-[#6B6560] hover:bg-[#E3DDD4] hover:text-[#1A1917]";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${disabledClasses}`}
    >
      {children}
    </button>
  );
}

function ReplyItem({
  reply,
  currentUserId,
  documentOwnerId,
  onEdit,
  onDelete,
  isCompleted,
  canEditComments = true,
}: {
  reply: Comment;
  currentUserId?: string;
  documentOwnerId?: string;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  isCompleted?: boolean;
  canEditComments?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [editFocused, setEditFocused] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const isCommentAuthor = currentUserId === reply.user.id;
  const isDocumentAuthor = reply.user.id === documentOwnerId;
  const isCurrentUserDocOwner = currentUserId === documentOwnerId;
  const edited = isEdited(reply.createdAt, reply.updatedAt);

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    if (editContent !== reply.content && onEdit) {
      onEdit(reply.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(reply.content);
    setIsEditing(false);
  };

  const handleConfirmDelete = () => {
    setFadeOut(true);
    setTimeout(() => {
      onDelete?.(reply.id);
    }, 150);
  };

  if (fadeOut) {
    return (
      <div className="flex gap-2 opacity-0 transition-opacity duration-150 ease-out" />
    );
  }

  if (isDeleting) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex-1 text-body-sm text-[#1A1917]">Delete this reply?</span>
        <button
          type="button"
          onClick={handleConfirmDelete}
          className="text-label-sm font-medium text-[#A63D2F] transition-colors duration-150"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setIsDeleting(false)}
          className="text-label-sm font-medium text-[#6B6560] transition-colors duration-150 hover:text-[#1A1917]"
        >
          Cancel
        </button>
      </div>
    );
  }

  const getPlainTextReply = (html: string): string => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent ?? "";
  };

  if (isEditing) {
    return (
      <div className="flex items-start gap-2">
        <Avatar name={getUserDisplayName(reply.user)} size="sm" />
        <div className="min-w-0 flex-1">
          <div className={`rounded-md border bg-white transition-colors duration-150 ${
            editFocused ? "border-[#B5763A]" : "border-[#E0D9D0]"
          }`}>
            <div className="px-3 py-2">
              <RichTextInput
                value={editContent}
                onChange={setEditContent}
                onFocus={() => setEditFocused(true)}
                onBlur={() => setEditFocused(false)}
                className="w-full text-body-sm text-[#1A1917]"
                autoFocus
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <SmallButton variant="ghost" onClick={handleCancelEdit}>
              Cancel
            </SmallButton>
            <SmallButton variant="primary" onClick={handleSaveEdit} disabled={!getPlainTextReply(editContent).trim()}>
              Save
            </SmallButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group relative flex items-start gap-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); if (!menuOpen) setMenuOpen(false); }}
    >
      <Avatar name={getUserDisplayName(reply.user)} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-label-md font-medium text-[#1A1917]">{getUserDisplayName(reply.user)}</span>
          {isCommentAuthor ? (
            <span className="text-label-sm font-medium text-[#9E9892]">(You)</span>
          ) : isDocumentAuthor && !isCurrentUserDocOwner ? (
            <span className="text-label-sm font-medium text-[#B5763A]">(Author)</span>
          ) : null}
          <span className="text-caption text-[#9E9892]">
            {new Date(reply.createdAt).toLocaleDateString()}
          </span>
          {edited && (
            <span className="text-caption text-[#9E9892]">(edited)</span>
          )}
        </div>
        <p 
          className="mt-1 text-body-sm leading-relaxed text-[#1A1917]" 
          dangerouslySetInnerHTML={{ __html: reply.content }} 
        />
      </div>
      
      {/* Author controls */}
      {isCommentAuthor && canEditComments && !isCompleted && (isHovered || menuOpen) && (
        <div className="absolute right-0 top-0">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded text-[#9E9892] transition-all duration-150 hover:bg-[#E3DDD4] hover:text-[#1A1917]"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              sideOffset={4}
              className="w-28 rounded-md border border-[#D9D3C7] bg-[#F7F4EF] p-1 shadow-[0_4px_12px_rgba(26,25,23,0.10)]"
            >
              <button
                type="button"
                className="flex h-[30px] w-full items-center px-3 text-body-sm text-[#1A1917] transition-colors duration-150 hover:bg-[#EFEBE3]"
                onClick={() => {
                  setMenuOpen(false);
                  setIsEditing(true);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="flex h-[30px] w-full items-center px-3 text-body-sm text-[#A63D2F] transition-colors duration-150 hover:bg-[#FDECEA]"
                onClick={() => {
                  setMenuOpen(false);
                  setIsDeleting(true);
                }}
              >
                Delete
              </button>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  isCompleted,
  onCommentClick,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
  currentUserName,
  documentOwnerId,
  canEditComments = true,
}: {
  comment: Comment;
  isCompleted?: boolean;
  onCommentClick?: (comment: Comment) => void;
  onReply?: (parentId: string, content: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  currentUserId?: string;
  currentUserName?: string | null;
  documentOwnerId?: string;
  canEditComments?: boolean;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyFocused, setReplyFocused] = useState(false);
  const replyContentRef = useRef(replyContent);
  replyContentRef.current = replyContent;
  const replyInputRef = useRef<RichTextInputRef | null>(null);
  const [replyFormattingState, setReplyFormattingState] = useState({ isBold: false, isItalic: false });

  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editFocused, setEditFocused] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const isCommentAuthor = currentUserId === comment.user.id;
  const isDocumentAuthor = comment.user.id === documentOwnerId;
  const isCurrentUserDocOwner = currentUserId === documentOwnerId;
  const edited = isEdited(comment.createdAt, comment.updatedAt);

  const handleClick = () => {
    if (comment.highlightedText && onCommentClick) {
      onCommentClick(comment);
    }
  };

  const handleReplySubmit = () => {
    if (!replyContent.trim() || !onReply) return;
    onReply(comment.id, replyContent);
    setReplyContent("");
    setShowReply(false);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    if (editContent !== comment.content && onEdit) {
      onEdit(comment.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const getPlainTextComment = (html: string): string => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent ?? "";
  };

  const handleConfirmDelete = () => {
    setFadeOut(true);
    setTimeout(() => {
      onDelete?.(comment.id);
    }, 150);
  };

  if (fadeOut) {
    return (
      <div className="border-b border-[#D9D3C7] p-4 opacity-0 transition-opacity duration-150 ease-out last:border-b-0" />
    );
  }

  if (isDeleting) {
    return (
      <div className="border-b border-[#D9D3C7] p-4 last:border-b-0">
        <div className="flex items-center gap-3">
          <span className="flex-1 text-body-sm text-[#1A1917]">Delete this comment?</span>
          <button
            type="button"
            onClick={handleConfirmDelete}
            className="text-label-sm font-medium text-[#A63D2F] transition-colors duration-150"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setIsDeleting(false)}
            className="text-label-sm font-medium text-[#6B6560] transition-colors duration-150 hover:text-[#1A1917]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group relative border-b border-[#D9D3C7] p-4 last:border-b-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); if (!menuOpen) setMenuOpen(false); }}
    >
      {/* Author controls - top right */}
      {isCommentAuthor && canEditComments && !isCompleted && !isEditing && (isHovered || menuOpen) && (
        <div className="absolute right-4 top-4">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded text-[#9E9892] transition-all duration-150 hover:bg-[#E3DDD4] hover:text-[#1A1917]"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              sideOffset={4}
              className="w-28 rounded-md border border-[#D9D3C7] bg-[#F7F4EF] p-1 shadow-[0_4px_12px_rgba(26,25,23,0.10)]"
            >
              <button
                type="button"
                className="flex h-[30px] w-full items-center px-3 text-body-sm text-[#1A1917] transition-colors duration-150 hover:bg-[#EFEBE3]"
                onClick={() => {
                  setMenuOpen(false);
                  setIsEditing(true);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="flex h-[30px] w-full items-center px-3 text-body-sm text-[#A63D2F] transition-colors duration-150 hover:bg-[#FDECEA]"
                onClick={() => {
                  setMenuOpen(false);
                  setIsDeleting(true);
                }}
              >
                Delete
              </button>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="flex gap-3">
        <Avatar name={getUserDisplayName(comment.user)} />
        <div className="min-w-0 flex-1">
          {/* Author + timestamp */}
          <div className="flex items-baseline gap-2">
            <span className="text-label-md font-medium text-[#1A1917]">{getUserDisplayName(comment.user)}</span>
            {isCommentAuthor ? (
              <span className="text-label-sm font-medium text-[#9E9892]">(You)</span>
            ) : isDocumentAuthor && !isCurrentUserDocOwner ? (
              <span className="text-label-sm font-medium text-[#B5763A]">(Author)</span>
            ) : null}
            <span className="text-caption text-[#9E9892]">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
            {edited && (
              <span className="text-caption text-[#9E9892]">(edited)</span>
            )}
          </div>

          {/* Quoted text block */}
          {comment.highlightedText && (
            <button
              type="button"
              onClick={handleClick}
              className="mb-2 mt-2 block w-full cursor-pointer rounded border-l-[3px] border-[#C8C0B4] bg-[#E3DDD4] px-3 py-2 text-left text-body-sm italic text-[#6B6560] transition-colors duration-150 hover:bg-[#D9D3C7]"
            >
              {comment.highlightedText}
            </button>
          )}

          {/* Comment body or edit mode */}
          {isEditing ? (
            <div className="mt-2">
              <div className={`rounded-md border bg-white transition-colors duration-150 ${
                editFocused ? "border-[#B5763A]" : "border-[#E0D9D0]"
              }`}>
                <div className="px-3 py-2">
                  <RichTextInput
                    value={editContent}
                    onChange={setEditContent}
                    onFocus={() => setEditFocused(true)}
                    onBlur={() => setEditFocused(false)}
                    className="w-full text-body-sm text-[#1A1917]"
                    autoFocus
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <SmallButton variant="ghost" onClick={handleCancelEdit}>
                  Cancel
                </SmallButton>
                <SmallButton variant="primary" onClick={handleSaveEdit} disabled={!getPlainTextComment(editContent).trim()}>
                  Save
                </SmallButton>
              </div>
            </div>
          ) : (
            <p 
              className="mt-1 text-body-sm leading-relaxed text-[#1A1917]" 
              dangerouslySetInnerHTML={{ __html: comment.content }} 
            />
          )}

          {/* Reply link */}
          {!isCompleted && !isEditing && (
            <button
              type="button"
              onClick={() => setShowReply(!showReply)}
              className="mt-2 cursor-pointer text-label-sm font-medium text-[#9E9892] transition-colors duration-150 hover:text-[#B5763A]"
            >
              Reply
            </button>
          )}

          {/* Reply input */}
          {showReply && (
            <div 
              className="ml-6 mt-3"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setReplyFocused(false);
                  if (!getPlainTextComment(replyContentRef.current).trim()) {
                    setShowReply(false);
                  }
                }
              }}
            >
              <div className="flex items-start gap-2">
                <Avatar name={currentUserName ?? null} size="sm" />
                <div className="flex-1">
                  <div className={`rounded-md border bg-white transition-colors duration-150 ${
                    replyFocused ? "border-[#B5763A]" : "border-[#E0D9D0]"
                  }`}>
                    <div className="px-3 py-2">
                      <RichTextInput
                        inputRef={replyInputRef}
                        value={replyContent}
                        onChange={setReplyContent}
                        onFocus={() => setReplyFocused(true)}
                        onFormattingChange={setReplyFormattingState}
                        placeholder="Write a reply…"
                        className="w-full text-body-sm text-[#1A1917]"
                        autoFocus
                      />
                    </div>
                    {/* Toolbar */}
                    <div className="flex items-center justify-between border-t border-[#D9D3C7] px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => replyInputRef.current?.applyBold()}
                          className={`flex size-6 items-center justify-center rounded transition-all duration-150 ${
                            replyFormattingState.isBold 
                              ? "bg-[#E3DDD4] text-[#1A1917]" 
                              : "text-[#9E9892] hover:bg-[#E3DDD4] hover:text-[#1A1917]"
                          }`}
                          title="Bold"
                        >
                          <Bold className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => replyInputRef.current?.applyItalic()}
                          className={`flex size-6 items-center justify-center rounded transition-all duration-150 ${
                            replyFormattingState.isItalic 
                              ? "bg-[#E3DDD4] text-[#1A1917]" 
                              : "text-[#9E9892] hover:bg-[#E3DDD4] hover:text-[#1A1917]"
                          }`}
                          title="Italic"
                        >
                          <Italic className="size-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <SmallButton variant="ghost" onClick={() => setShowReply(false)}>
                          Cancel
                        </SmallButton>
                        <SmallButton 
                          variant="primary" 
                          onClick={handleReplySubmit} 
                          disabled={!getPlainTextComment(replyContent).trim()}
                        >
                          Reply
                        </SmallButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-6 mt-4 space-y-3">
              {comment.replies.map((reply) => (
                <ReplyItem 
                  key={reply.id} 
                  reply={reply} 
                  currentUserId={currentUserId}
                  documentOwnerId={documentOwnerId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isCompleted={isCompleted}
                  canEditComments={canEditComments}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentsPanel({
  comments,
  isLoading,
  pendingComment,
  onSubmitComment,
  onCancelComment,
  onReply,
  onEdit,
  onDelete,
  isSubmitting,
  isCompleted,
  onCommentClick,
  onTypingChange,
  currentUserId,
  documentOwnerId,
  canEditComments = true,
}: Props) {
  const [commentContent, setCommentContent] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [formattingState, setFormattingState] = useState({ isBold: false, isItalic: false });
  const inputRef = useRef<RichTextInputRef | null>(null);

  const currentUser = comments?.find(c => c.user.id === currentUserId)?.user;
  const currentUserName = currentUser ? getUserDisplayName(currentUser) : null;

  const getPlainText = (html: string): string => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent ?? "";
  };

  const handleContentChange = (value: string) => {
    const hadContent = getPlainText(commentContent).trim().length > 0;
    const hasContent = getPlainText(value).trim().length > 0;
    setCommentContent(value);
    if (hadContent !== hasContent) {
      onTypingChange?.(hasContent);
    }
  };

  const handleSubmit = () => {
    if (!getPlainText(commentContent).trim()) return;
    onSubmitComment(commentContent);
    setCommentContent("");
    onTypingChange?.(false);
  };

  const handleCancel = () => {
    setCommentContent("");
    onTypingChange?.(false);
    onCancelComment();
  };

  const applyBold = () => {
    inputRef.current?.applyBold();
  };

  const applyItalic = () => {
    inputRef.current?.applyItalic();
  };

  return (
    <div data-comments-panel>
      {isCompleted && (
        <div className="border-b border-[#D9D3C7] bg-[#E3DDD4] px-4 py-3">
          <p className="text-caption text-[#6B6560]">
            This piece has been closed. Commenting is no longer allowed.
          </p>
        </div>
      )}

      {/* New comment input */}
      {!isCompleted && pendingComment && (
        <div className="border-b border-[#D9D3C7] p-4">
          {/* Quoted text block */}
          <div className="mb-3 rounded border-l-[3px] border-[#C8C0B4] bg-[#E3DDD4] px-3 py-2">
            <p className="text-body-sm italic text-[#6B6560]">{pendingComment.text}</p>
          </div>

          {/* Comment input container */}
          <div className={`rounded-md border bg-white transition-colors duration-150 ${inputFocused ? "border-[#B5763A]" : "border-[#E0D9D0]"}`}>
            <div className="p-3">
              <RichTextInput
                inputRef={inputRef}
                value={commentContent}
                onChange={handleContentChange}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onFormattingChange={setFormattingState}
                placeholder="Add your comment…"
                className="w-full text-body-sm text-[#1A1917]"
                autoFocus
              />
            </div>

            {/* Toolbar and actions */}
            <div className="flex items-center justify-between border-t border-[#D9D3C7] px-3 py-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={applyBold}
                  className={`flex size-6 items-center justify-center rounded transition-all duration-150 ${
                    formattingState.isBold 
                      ? "bg-[#E3DDD4] text-[#1A1917]" 
                      : "text-[#9E9892] hover:bg-[#E3DDD4] hover:text-[#1A1917]"
                  }`}
                  title="Bold"
                >
                  <Bold className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={applyItalic}
                  className={`flex size-6 items-center justify-center rounded transition-all duration-150 ${
                    formattingState.isItalic 
                      ? "bg-[#E3DDD4] text-[#1A1917]" 
                      : "text-[#9E9892] hover:bg-[#E3DDD4] hover:text-[#1A1917]"
                  }`}
                  title="Italic"
                >
                  <Italic className="size-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <SmallButton variant="ghost" onClick={handleCancel}>
                  Cancel
                </SmallButton>
                <SmallButton 
                  variant="primary" 
                  onClick={handleSubmit} 
                  disabled={!getPlainText(commentContent).trim() || isSubmitting}
                >
                  Save
                </SmallButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4 p-4">
          <Skeleton className="h-20 w-full bg-[#E3DDD4]" />
          <Skeleton className="h-20 w-full bg-[#E3DDD4]" />
        </div>
      ) : comments && comments.length > 0 ? (
        <div>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isCompleted={isCompleted}
              onCommentClick={onCommentClick}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              documentOwnerId={documentOwnerId}
              canEditComments={canEditComments}
            />
          ))}
        </div>
      ) : !pendingComment ? (
        <div className="p-4">
          <p className="text-body-sm text-[#9E9892]">
            {isCompleted ? "No comments on this piece." : "No comments yet. Select text in the document to add a comment."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
