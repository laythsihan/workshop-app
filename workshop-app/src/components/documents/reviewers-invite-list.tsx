"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Mail,
  RotateCcw,
  X,
  Loader2,
  CheckCircle,
  UserMinus,
} from "lucide-react";
import { cn } from "workshop/lib/utils";
import { Button } from "workshop/components/ui/button";
import { api } from "workshop/trpc/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "workshop/components/ui/tooltip";
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

type InvitationItem = {
  id: string;
  email: string | null;
  status: string;
  createdAt: Date;
  expiresAt: Date | null;
  resendCount: number;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

type Props = {
  documentId: string;
  compact?: boolean;
};

export function ReviewersInviteList({ documentId, compact = false }: Props) {
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteInputValue, setInviteInputValue] = useState("");
  const [inviteResult, setInviteResult] = useState<{
    sent: string[];
    alreadyInvited: string[];
    invalid: string[];
    failed: string[];
  } | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data: invitations, isLoading } = api.document.listInvitations.useQuery(
    { documentId },
    { enabled: !!documentId }
  );
  const inviteByEmailMutation = api.document.inviteByEmail.useMutation({
    onSuccess: (data) => {
      setInviteResult(data);
      setInviteEmails((prev) => prev.filter((e) => !data.sent.includes(e)));
      void utils.document.listInvitations.invalidate({ documentId });
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to send invites", { closeButton: true });
    },
  });
  const resendInviteMutation = api.document.resendInvite.useMutation({
    onSuccess: () => {
      void utils.document.listInvitations.invalidate({ documentId });
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to resend invite", { closeButton: true });
    },
  });
  const cancelInviteMutation = api.document.cancelInvite.useMutation({
    onSuccess: () => {
      setCancelTargetId(null);
      void utils.document.listInvitations.invalidate({ documentId });
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to cancel invite", { closeButton: true });
    },
  });
  const removeCollaboratorMutation = api.document.removeCollaborator.useMutation({
    onSuccess: () => {
      setRemoveTargetId(null);
      setRemoveError(null);
      toast.success("Reviewer removed", { duration: 2000 });
      void utils.document.listInvitations.invalidate({ documentId });
      void utils.document.collaborators.invalidate({ documentId });
    },
    onError: (err) => {
      setRemoveError(err.message ?? "Couldn't remove reviewer. Try again.");
    },
  });

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
    const valid = inviteEmails.filter((e) => isValidEmailFormat(e));
    if (valid.length === 0) return;
    inviteByEmailMutation.mutate({ documentId, emails: valid });
  }, [documentId, inviteEmails, inviteByEmailMutation]);

  const hasValidInviteTag = inviteEmails.some((e) => isValidEmailFormat(e));

  function getInitials(name: string | null, email: string | null): string {
    if (name?.trim()) {
      const parts = name.trim().split(/\s+/);
      const a = parts[0]?.[0];
      const b = parts[1]?.[0];
      if (a && b) return (a + b).toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "?";
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={compact ? "space-y-3" : "space-y-4"}>
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
            className="min-w-[140px] flex-1 border-0 bg-transparent py-1 text-label-sm text-[#1A1917] placeholder:text-[#9E9892] focus:outline-none"
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

        <div>
          <h4 className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
            Reviewers
          </h4>
          {isLoading ? (
            <p className="py-3 text-caption text-[#9E9892]">Loading…</p>
          ) : !invitations || invitations.length === 0 ? (
            <p className="py-3 text-caption text-[#9E9892]">
              No reviewers invited yet
            </p>
          ) : (
            <ul className="mt-1 space-y-0">
              {invitations.map((inv: InvitationItem) => {
                const displayName =
                  inv.status === "ACCEPTED" && inv.user
                    ? inv.user.name ?? inv.user.email ?? "Unknown"
                    : inv.email ?? "—";
                const isRemoveConfirm = removeTargetId === inv.id;

                if (inv.status === "ACCEPTED" && isRemoveConfirm) {
                  return (
                    <li
                      key={inv.id}
                      className="flex flex-col gap-2 py-1.5 transition-opacity duration-150"
                    >
                      <p className="text-body-sm text-[#1A1917]">
                        {displayName} will lose access to this document. Their
                        comments will remain.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRemoveTargetId(null);
                            setRemoveError(null);
                          }}
                          className="text-label-sm text-[#6B6560] hover:underline"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!inv.id) return;
                            removeCollaboratorMutation.mutate(
                              { invitationId: inv.id },
                              { onSuccess: () => setRemoveTargetId(null) }
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
                    </li>
                  );
                }

                return (
                  <li
                    key={inv.id}
                    className="flex h-9 items-center justify-between gap-3 py-1.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {inv.status === "ACCEPTED" && inv.user ? (
                        inv.user.image ? (
                          <Image
                            src={inv.user.image}
                            alt={inv.user.name ?? inv.user.email ?? "User"}
                            width={32}
                            height={32}
                            className="size-8 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E3DDD4] text-label-sm font-medium text-[#6B6560]">
                            {getInitials(inv.user.name, inv.user.email)}
                          </div>
                        )
                      ) : (
                        <div className="flex size-8 shrink-0 items-center justify-center text-[#9E9892]">
                          <Mail className="size-4" />
                        </div>
                      )}
                      <span className="truncate text-label-md text-[#1A1917]">
                        {displayName}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-caption font-medium",
                          inv.status === "PENDING" &&
                            "bg-[rgba(196,147,63,0.12)] text-[#8A6425]",
                          inv.status === "ACCEPTED" &&
                            "bg-[rgba(74,155,111,0.12)] text-[#2E7050]"
                        )}
                      >
                        <span
                          className={cn(
                            "mr-1.5 inline-block size-1.5 rounded-full",
                            inv.status === "PENDING" && "bg-[#C4933F]",
                            inv.status === "ACCEPTED" && "bg-[#4A9B6F]"
                          )}
                        />
                        {inv.status === "PENDING" ? "Pending" : "Accepted"}
                      </span>
                      {inv.status === "PENDING" && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() =>
                                  resendInviteMutation.mutate({
                                    invitationId: inv.id,
                                  })
                                }
                                disabled={
                                  inv.resendCount >= 3 ||
                                  resendInviteMutation.isPending
                                }
                                className="flex size-6 items-center justify-center rounded text-[#9E9892] transition-colors hover:text-[#B5763A] disabled:opacity-50"
                              >
                                <RotateCcw className="size-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="rounded bg-[#1A1917] px-2 py-1 text-caption text-[#EDE9E1]">
                              {inv.resendCount >= 3
                                ? "Resend limit reached"
                                : "Resend invite"}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setCancelTargetId(inv.id)}
                                className="flex size-6 items-center justify-center rounded text-[#9E9892] transition-colors hover:text-[#A63D2F]"
                              >
                                <X className="size-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="rounded bg-[#1A1917] px-2 py-1 text-caption text-[#EDE9E1]">
                              Cancel invite
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {inv.status === "ACCEPTED" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => {
                                setRemoveError(null);
                                setRemoveTargetId(inv.id);
                              }}
                              className="flex size-6 items-center justify-center rounded text-[#9E9892] transition-colors hover:text-[#A63D2F]"
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog
        open={cancelTargetId !== null}
        onOpenChange={(open) => !open && setCancelTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this invite?</AlertDialogTitle>
            <AlertDialogDescription>
              The recipient will no longer be able to use this invite link. You
              can send a new invite later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cancelTargetId &&
                cancelInviteMutation.mutate({ invitationId: cancelTargetId })
              }
              className="bg-[#A63D2F] text-white hover:bg-[#8A3328]"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
