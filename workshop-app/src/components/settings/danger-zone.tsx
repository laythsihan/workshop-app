"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader, Eye, EyeOff } from "lucide-react";
import { Button } from "workshop/components/ui/button";
import { Input } from "workshop/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "workshop/components/ui/dialog";
import { api } from "workshop/trpc/react";

const CONFIRM_TEXT = "DELETE";
const REAUTH_LOCK_MS = 5000;
const REAUTH_FAILURES_BEFORE_LOCK = 3;

export function DangerZone() {
  const router = useRouter();
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [reAuthModalOpen, setReAuthModalOpen] = useState(false);
  const [reAuthPassword, setReAuthPassword] = useState("");
  const [reAuthShowPassword, setReAuthShowPassword] = useState(false);
  const [reAuthError, setReAuthError] = useState<string | null>(null);
  const [, setReAuthFailures] = useState(0);
  const [reAuthLockedUntil, setReAuthLockedUntil] = useState<number | null>(null);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: hasPasswordData } = api.user.hasPassword.useQuery();
  const hasPassword = hasPasswordData?.hasPassword ?? false;

  const { data: sharedCount } = api.user.getSharedDocumentCount.useQuery();
  const verifyPassword = api.user.verifyPassword.useMutation({
    onSuccess: (data) => {
      if (data.valid) {
        setReAuthModalOpen(false);
        setReAuthPassword("");
        setReAuthError(null);
        setReAuthFailures(0);
        setWarningModalOpen(true);
      } else {
        setReAuthError("Incorrect password. Please try again.");
        setReAuthFailures((n) => {
          const next = n + 1;
          if (next >= REAUTH_FAILURES_BEFORE_LOCK) {
            setReAuthLockedUntil(Date.now() + REAUTH_LOCK_MS);
          }
          return next;
        });
      }
    },
    onError: (err) => {
      setReAuthError(err.message ?? "Incorrect password. Please try again.");
      setReAuthFailures((n) => {
        const next = n + 1;
        if (next >= REAUTH_FAILURES_BEFORE_LOCK) {
          setReAuthLockedUntil(Date.now() + REAUTH_LOCK_MS);
        }
        return next;
      });
    },
  });

  useEffect(() => {
    if (reAuthLockedUntil == null) return;
    const t = setTimeout(() => {
      setReAuthLockedUntil(null);
      setReAuthFailures(0);
    }, reAuthLockedUntil - Date.now());
    return () => clearTimeout(t);
  }, [reAuthLockedUntil]);

  const scheduleDeletion = api.user.scheduleDeletion.useMutation({
    onSuccess: async () => {
      await signOut({ callbackUrl: "/account-deleted" });
      router.push("/account-deleted");
    },
    onError: () => {
      setDeleteLoading(false);
    },
  });

  const handleExport = async () => {
    setExportError(null);
    setExportLoading(true);
    try {
      const res = await fetch("/api/user/export", { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setExportError(data.error ?? "Export failed. Please try again.");
        return;
      }
      const blob = await res.blob();
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workshop-export-${date}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  // For email/password users, show re-auth modal first. OAuth-only users go straight to warning.
  // TODO: Future OAuth re-authentication (e.g. requiring re-authorization with Google) could be added here for stricter security.
  const handleDeleteClick = () => {
    if (hasPassword) {
      setReAuthModalOpen(true);
      setReAuthPassword("");
      setReAuthError(null);
      setReAuthFailures(0);
      setReAuthLockedUntil(null);
    } else {
      setWarningModalOpen(true);
    }
  };

  const handleReAuthConfirm = () => {
    if (reAuthLockedUntil != null && Date.now() < reAuthLockedUntil) return;
    setReAuthError(null);
    verifyPassword.mutate({ password: reAuthPassword });
  };

  const handleReAuthCancel = () => {
    setReAuthModalOpen(false);
    setReAuthPassword("");
    setReAuthError(null);
  };

  const handleContinueToDelete = () => {
    setWarningModalOpen(false);
    setConfirmModalOpen(true);
    setConfirmInput("");
  };

  const handleConfirmDelete = () => {
    if (confirmInput !== CONFIRM_TEXT) return;
    setDeleteLoading(true);
    scheduleDeletion.mutate();
  };

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#A63D2F]">
          Danger Zone
        </h2>
        <div
          className="rounded-md border border-[rgba(166,61,47,0.2)] p-6"
          style={{ borderColor: "rgba(166,61,47,0.2)" }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-label-md font-medium text-[#1A1917]">
                Export my data
              </p>
              <p className="mt-0.5 text-body-sm text-[#6B6560]">
                Download a ZIP file of all documents you own in their original
                format.
              </p>
              {exportError && (
                <p className="mt-2 text-caption text-[#A63D2F]">{exportError}</p>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={exportLoading}
              onClick={handleExport}
              className="shrink-0"
            >
              {exportLoading ? (
                <>
                  <Loader className="size-4 animate-spin" />
                  Preparing export…
                </>
              ) : (
                "Export my data"
              )}
            </Button>
          </div>

          <div className="my-6 border-t border-[#D9D3C7]" />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-label-md font-medium text-[#1A1917]">
                Delete account
              </p>
              <p className="mt-0.5 text-body-sm text-[#6B6560]">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDeleteClick}
              className="shrink-0 border border-[#A63D2F] text-[#A63D2F] hover:bg-[rgba(166,61,47,0.06)]"
            >
              Delete account
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={reAuthModalOpen}
        onOpenChange={(open) => {
          if (!open) handleReAuthCancel();
          setReAuthModalOpen(open);
        }}
      >
        <DialogContent className="max-w-[440px] border-[#D9D3C7] bg-[#FDFBF8] shadow-[0_8px_24px_rgba(26,25,23,0.14)]">
          <DialogHeader>
            <DialogTitle className="font-lora text-display-md text-[#1A1917]">
              Confirm your identity
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p className="text-body-md text-[#6B6560]">
                  For your security, please enter your password to continue.
                </p>
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={reAuthShowPassword ? "text" : "password"}
                      placeholder="Your password"
                      value={reAuthPassword}
                      onChange={(e) => {
                        setReAuthPassword(e.target.value);
                        setReAuthError(null);
                      }}
                      disabled={verifyPassword.isPending}
                      className="pr-10 border-[#D9D3C7] focus:border-[#B5763A] focus:ring-[#B5763A]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setReAuthShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9892] hover:text-[#6B6560]"
                      aria-label={reAuthShowPassword ? "Hide password" : "Show password"}
                    >
                      {reAuthShowPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {reAuthError && (
                    <p className="text-caption text-[#A63D2F]">{reAuthError}</p>
                  )}
                  {reAuthLockedUntil != null && Date.now() < reAuthLockedUntil && (
                    <p className="text-caption text-[#6B6560]">
                      Too many attempts. Please wait a moment before trying again.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleReAuthCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleReAuthConfirm}
                    disabled={
                      !reAuthPassword.trim() ||
                      verifyPassword.isPending ||
                      (reAuthLockedUntil != null && Date.now() < reAuthLockedUntil)
                    }
                    className="bg-[#B5763A] text-white hover:bg-[#9E6530]"
                  >
                    {verifyPassword.isPending ? (
                      <>
                        <Loader className="mr-2 size-4 animate-spin" />
                        Checking…
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={warningModalOpen} onOpenChange={setWarningModalOpen}>
        <DialogContent className="max-w-[560px] border-[#D9D3C7] bg-[#FDFBF8] shadow-[0_8px_24px_rgba(26,25,23,0.14)]">
          <DialogHeader>
            <DialogTitle className="font-lora text-display-md text-[#1A1917]">
              Before you delete your account
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 text-body-md text-[#1A1917]">
                <p>
                  Deleting your account is permanent and cannot be undone. Here
                  is exactly what will happen:
                </p>
                <ul className="list-inside list-disc space-y-1 text-body-sm text-[#6B6560]">
                  <li>
                    All documents you own will be permanently deleted, including
                    their files in storage
                  </li>
                  <li>
                    All comments you have left on others&apos; work will be
                    anonymized and attributed to &quot;Deleted User&quot; — they
                    will not be removed, as they form part of others&apos;
                    workshop record
                  </li>
                  <li>
                    Any documents you currently share with others will become
                    inaccessible to them immediately
                  </li>
                  <li>
                    Your account, profile, and all associated data will be
                    permanently removed
                  </li>
                </ul>
                {sharedCount !== undefined && sharedCount > 0 && (
                  <div
                    className="border-l-[3px] border-[#A63D2F] bg-[rgba(166,61,47,0.06)] p-3 text-body-sm text-[#A63D2F]"
                    style={{ backgroundColor: "rgba(166,61,47,0.06)" }}
                  >
                    You have {sharedCount} document(s) currently shared with
                    others. They will lose access immediately upon deletion.
                  </div>
                )}
                <p>
                  Would you like to export your documents before deleting?{" "}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={exportLoading}
                    onClick={handleExport}
                    className="ml-2 align-baseline"
                  >
                    {exportLoading ? (
                      <>
                        <Loader className="mr-1 size-3 animate-spin" />
                        Preparing…
                      </>
                    ) : (
                      "Export my data"
                    )}
                  </Button>
                </p>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setWarningModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="border-[#A63D2F] text-[#A63D2F] hover:bg-[rgba(166,61,47,0.06)]"
                    onClick={handleContinueToDelete}
                  >
                    Continue to delete
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-[560px] border-[#D9D3C7] bg-[#FDFBF8] shadow-[0_8px_24px_rgba(26,25,23,0.14)]">
          <DialogHeader>
            <DialogTitle className="font-lora text-display-md text-[#A63D2F]">
              Delete your account
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4">
                <p className="text-body-md text-[#1A1917]">
                  Type DELETE in the field below to confirm. This action is
                  permanent.
                </p>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type DELETE here"
                  disabled={deleteLoading}
                  className="border-[#D9D3C7] focus:border-[#A63D2F] focus:ring-[#A63D2F]/20"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={deleteLoading}
                    onClick={() => setConfirmModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={confirmInput !== CONFIRM_TEXT || deleteLoading}
                    onClick={handleConfirmDelete}
                    className="bg-[#A63D2F] text-[#F7F4EF] hover:bg-[#8f3528] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading ? (
                      <>
                        <Loader className="mr-2 size-4 animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      "Delete my account"
                    )}
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
