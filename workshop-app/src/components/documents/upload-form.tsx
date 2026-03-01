"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, Loader2, Copy, Check, ChevronDown, CheckCircle, X } from "lucide-react";
import { Button } from "workshop/components/ui/button";
import { Input } from "workshop/components/ui/input";
import { cn } from "workshop/lib/utils";
import { getWordCount } from "workshop/lib/word-count";
import { extractTitle, type TitleExtractionResult } from "workshop/lib/title-extract";
import { GENRE_OPTIONS, type GenreValue } from "workshop/lib/genre";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "workshop/components/ui/popover";
import { api } from "workshop/trpc/react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

const ACCEPT = ".doc,.docx,.pdf,.txt";
const ALLOWED_EXT = /\.(doc|docx|pdf|txt)$/i;

type UploadFormProps = {
  onSuccess?: () => void;
};

export function UploadForm({ onSuccess }: UploadFormProps = {}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [titleSource, setTitleSource] = useState<TitleExtractionResult["source"] | null>(null);
  const [isExtractingTitle, setIsExtractingTitle] = useState(false);
  const [titleWasEdited, setTitleWasEdited] = useState(false);
  const [genre, setGenre] = useState<GenreValue | null>(null);
  const [genreOpen, setGenreOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [wordCountLoading, setWordCountLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [newDocumentId, setNewDocumentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteInputValue, setInviteInputValue] = useState("");
  const [inviteResult, setInviteResult] = useState<{
    sent: string[];
    alreadyInvited: string[];
    invalid: string[];
    failed: string[];
  } | null>(null);

  const inviteByEmailMutation = api.document.inviteByEmail.useMutation({
    onSuccess: (data) => {
      setInviteResult(data);
      setInviteEmails((prev) => prev.filter((e) => !data.sent.includes(e)));
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to send invites", { closeButton: true });
    },
  });

  // Extract title and word count when file changes
  useEffect(() => {
    if (!file) {
      setWordCount(null);
      setWordCountLoading(false);
      setTitleSource(null);
      setIsExtractingTitle(false);
      return;
    }
    
    // Word count extraction
    setWordCountLoading(true);
    getWordCount(file)
      .then((count) => {
        setWordCount(count);
      })
      .catch(() => {
        setWordCount(null);
      })
      .finally(() => {
        setWordCountLoading(false);
      });
    
    // Title extraction (only if user hasn't manually edited the title)
    if (!titleWasEdited) {
      setIsExtractingTitle(true);
      extractTitle(file)
        .then((result) => {
          setTitle(result.title);
          setTitleSource(result.source);
        })
        .catch(() => {
          // On any error, leave title empty
          setTitleSource(null);
        })
        .finally(() => {
          setIsExtractingTitle(false);
        });
    }
  }, [file, titleWasEdited]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setTitleWasEdited(true);
  };

  const validateFile = useCallback((f: File) => {
    if (!ALLOWED_EXT.test(f.name)) {
      setError("Allowed formats: .doc, .docx, .pdf, .txt");
      return false;
    }
    setError(null);
    return true;
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files[0];
      if (f && validateFile(f)) setFile(f);
    },
    [validateFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f && validateFile(f)) setFile(f);
      else if (!f) setFile(null);
    },
    [validateFile]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file || !title.trim()) return;
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.set("file", file);
      formData.set("title", title.trim());
      if (wordCount !== null) {
        console.log('[Upload] Sending word count:', wordCount);
        formData.set("wordCount", wordCount.toString());
      } else {
        console.log('[Upload] Word count is null, not sending');
      }
      if (genre) {
        formData.set("genre", genre);
      }
      try {
        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          id?: string;
          shareUrl?: string;
        };
        if (!res.ok) {
          setError(
            res.status === 401
              ? "Please sign in to upload documents."
              : data.error ?? "Upload failed"
          );
          return;
        }
        toast.success(`${file.name} uploaded successfully`, { closeButton: true });
        if (data.id && data.shareUrl) {
          setNewDocumentId(data.id);
          setShareUrl(data.shareUrl);
        } else if (data.id) {
          setNewDocumentId(data.id);
          if (onSuccess) onSuccess();
          else router.push("/dashboard");
          router.refresh();
        } else {
          if (onSuccess) onSuccess();
          else router.push("/dashboard");
          router.refresh();
        }
      } catch {
        setError("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [file, title, wordCount, genre, router, onSuccess]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    setWordCount(null);
    setTitle("");
    setTitleSource(null);
    setTitleWasEdited(false);
    setError(null);
  }, []);

  const copyShareLink = useCallback(() => {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success("Link copied to clipboard", { closeButton: true });
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  const handleDone = useCallback(() => {
    setShareUrl(null);
    setNewDocumentId(null);
    setInviteResult(null);
    setInviteEmails([]);
    setInviteInputValue("");
    if (onSuccess) onSuccess();
    else router.push("/dashboard");
    router.refresh();
  }, [onSuccess, router]);

  const addInviteEmail = useCallback(() => {
    const v = inviteInputValue.trim().toLowerCase();
    if (!v) return;
    if (inviteEmails.includes(v)) {
      setInviteInputValue("");
      return;
    }
    setInviteEmails((prev) => [...prev, v]);
    setInviteInputValue("");
    setInviteResult(null);
  }, [inviteInputValue, inviteEmails]);

  const removeInviteEmail = useCallback((email: string) => {
    setInviteEmails((prev) => prev.filter((e) => e !== email));
    setInviteResult(null);
  }, []);

  const handleInviteKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addInviteEmail();
      }
    },
    [addInviteEmail]
  );

  const handleSendInvites = useCallback(() => {
    if (!newDocumentId || inviteEmails.length === 0) return;
    const valid = inviteEmails.filter((e) => isValidEmailFormat(e));
    if (valid.length === 0) return;
    inviteByEmailMutation.mutate({ documentId: newDocumentId, emails: valid });
  }, [newDocumentId, inviteEmails, inviteByEmailMutation]);

  const hasValidInviteTag = inviteEmails.some((e) => isValidEmailFormat(e));

  if (shareUrl && newDocumentId) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Share this link with reviewers. They’ll need to sign in to access the document.
        </p>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={shareUrl}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyShareLink}
            className="shrink-0"
          >
            {copied ? (
              <Check className="size-4 text-green-600" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>

        <div className="space-y-3">
          <h3 className="text-label-md font-medium text-[#1A1917]">
            Invite reviewers by email
          </h3>
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#D9D3C7] bg-white px-3 py-2">
            {inviteEmails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 rounded bg-[#E3DDD4] px-2 py-1 text-label-sm text-[#1A1917]"
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeInviteEmail(email)}
                  className="rounded p-0.5 text-[#9E9892] hover:bg-[#D9D3C7] hover:text-[#1A1917]"
                  aria-label={`Remove ${email}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add email addresses…"
              value={inviteInputValue}
              onChange={(e) => setInviteInputValue(e.target.value)}
              onKeyDown={handleInviteKeyDown}
              onBlur={addInviteEmail}
              className="min-w-[180px] flex-1 border-0 bg-transparent py-1 text-label-sm text-[#1A1917] placeholder:text-[#9E9892] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSendInvites}
              disabled={!hasValidInviteTag || inviteByEmailMutation.isPending}
            >
              {inviteByEmailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send invites"
              )}
            </Button>
          </div>
          {inviteResult && (
            <div className="space-y-1.5 text-label-sm">
              {inviteResult.sent.length > 0 && (
                <p className="flex items-center gap-2 text-[#4A9B6F]">
                  <CheckCircle className="size-3.5 shrink-0" />
                  Invites sent to {inviteResult.sent.length} reviewer(s)
                </p>
              )}
              {inviteResult.alreadyInvited.map((email) => (
                <p key={email} className="text-[#9E9892]">
                  {email} has already been invited
                </p>
              ))}
              {inviteResult.invalid.map((email) => (
                <p key={email} className="text-[#9E9892]">
                  {email} is not a valid email address
                </p>
              ))}
              {inviteResult.failed.map((email) => (
                <p key={email} className="text-[#9E9892]">
                  {email} — failed to send. Try again.
                </p>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleDone} size="sm">
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="doc-title" className="text-sm font-medium">
              Document name <span className="text-destructive">*</span>
            </label>
            <Input
              id="doc-title"
              placeholder="Enter a title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              disabled={uploading}
              required
              className={cn(
                "max-w-md",
                isExtractingTitle && "animate-pulse"
              )}
              aria-required
            />
            {titleSource && !titleWasEdited && (
              <p className="text-caption text-[#9E9892]">
                {titleSource === "document"
                  ? "Title detected from document — feel free to edit"
                  : "Title taken from filename — feel free to edit"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Genre</label>
            <Popover open={genreOpen} onOpenChange={setGenreOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={uploading}
                  className={cn(
                    "flex h-9 w-full max-w-md items-center justify-between rounded-md border border-[#D9D3C7] bg-white px-3 py-2 text-sm",
                    "hover:border-[#B8B0A4] focus:outline-none focus:ring-2 focus:ring-[#B5763A]/20 focus:border-[#B5763A]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    !genre && "text-[#9E9892]"
                  )}
                >
                  <span>
                    {genre
                      ? GENRE_OPTIONS.find((o) => o.value === genre)?.label
                      : "Select genre"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[#9E9892]" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <div className="py-1">
                  {GENRE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setGenre(option.value);
                        setGenreOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center px-3 py-2 text-sm text-[#1A1917]",
                        "hover:bg-[#F5F2ED]",
                        genre === option.value && "bg-[#F5F2ED]"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                  <div className="my-1 border-t border-[#D9D3C7]" />
                  <button
                    type="button"
                    onClick={() => {
                      setGenre(null);
                      setGenreOpen(false);
                    }}
                    className="flex w-full items-center px-3 py-2 text-sm text-[#9E9892] hover:bg-[#F5F2ED]"
                  >
                    Skip for now
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
              "border-border flex min-h-[180px] flex-col items-center justify-center border border-dashed p-8 transition-colors",
              dragActive && "border-foreground/30 bg-muted/50",
              file && "border-solid border-border bg-muted/30"
            )}
          >
            <input
              type="file"
              accept={ACCEPT}
              onChange={onInputChange}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="size-10 text-muted-foreground" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                  {wordCountLoading && " · Counting words…"}
                  {!wordCountLoading && wordCount !== null && ` · ${wordCount.toLocaleString()} words`}
                  {!wordCountLoading && wordCount === null && " · Word count unavailable"}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  disabled={uploading}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center gap-2"
              >
                <Upload className="size-10 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Drag and drop or click to choose
                </span>
                <span className="text-xs text-muted-foreground">
                  .doc, .docx, .pdf, .txt
                </span>
              </label>
            )}
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <Button type="submit" disabled={!file || !title.trim() || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Uploading…
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </form>
  );
}
