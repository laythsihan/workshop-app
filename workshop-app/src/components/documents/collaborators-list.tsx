"use client";

import { Users } from "lucide-react";

type Invitation = {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

type Props = {
  documentId: string;
  invitations: Invitation[];
  currentUserId: string;
  ownerId: string;
  ownerName: string | null;
  isOwner: boolean;
  hideHeader?: boolean;
};

export function CollaboratorsList({
  invitations,
  currentUserId,
  _ownerId,
  ownerName,
  isOwner,
  hideHeader = false,
}: Omit<Props, "ownerId"> & { _ownerId?: string }) {
  return (
    <div>
      {!hideHeader && (
        <div className="mb-4 flex items-center gap-2">
          <Users className="size-4" />
          <h3 className="text-sm font-medium">Collaborators</h3>
        </div>
      )}

      <div className={`space-y-2 ${hideHeader ? "pt-3" : ""}`}>
        {!isOwner && ownerName && (
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {ownerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{ownerName}</p>
              <p className="text-xs text-muted-foreground">Author</p>
            </div>
          </div>
        )}

        {invitations.length > 0 ? (
          invitations.map((inv) => {
            const isCurrentUser = inv.userId === currentUserId;
            return (
              <div key={inv.id} className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {inv.user.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {inv.user.name ?? inv.user.email ?? "Unknown"}
                    {isCurrentUser && (
                      <span className="ml-1 text-xs text-muted-foreground">(You)</span>
                    )}
                  </p>
                  {inv.user.email && inv.user.name && (
                    <p className="truncate text-xs text-muted-foreground">
                      {inv.user.email}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            No collaborators yet. Share the document to invite reviewers.
          </p>
        )}
      </div>
    </div>
  );
}
