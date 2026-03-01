"use client";

import { api } from "workshop/trpc/react";

type PendingDeletionBannerProps = {
  deletionScheduledAt: Date;
};

export function PendingDeletionBanner({
  deletionScheduledAt,
}: PendingDeletionBannerProps) {
  const cancelDeletion = api.user.cancelDeletion.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const formattedDate = new Date(deletionScheduledAt).toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );

  return (
    <div className="border-b border-[#A63D2F]/30 bg-[rgba(166,61,47,0.08)] px-4 py-3 text-center">
      <p className="text-body-sm text-[#1A1917]">
        Your account is scheduled for deletion on {formattedDate}. Changed your
        mind?{" "}
        {cancelDeletion.isPending ? (
          <span className="text-[#6B6560]">Cancelling…</span>
        ) : (
          <button
            type="button"
            onClick={() => cancelDeletion.mutate()}
            className="font-medium text-[#A63D2F] underline hover:text-[#8f3528]"
          >
            Cancel deletion
          </button>
        )}
      </p>
    </div>
  );
}
