/**
 * Shared activity label formatting for document-scoped and global (sidebar) feeds.
 * Used by DocumentActivityFeed (document sidebar) and GlobalActivityFeed (app sidebar).
 */

export type ActivityLabelScope = "document" | "global";

export type ActivityTypeForLabel =
  | "COMMENT_ADDED"
  | "REPLY_ADDED"
  | "STATUS_CHANGED"
  | "DOCUMENT_SHARED"
  | "DOCUMENT_RENAMED"
  | "DOCUMENT_UPLOADED"
  | "COLLABORATOR_REMOVED";

export function formatActivityLabel(
  scope: ActivityLabelScope,
  type: ActivityTypeForLabel,
  options: {
    actorName: string | null;
    documentTitle?: string | null;
    metadata?: { newStatus?: string; recipientName?: string; removedName?: string } | null;
    count?: number;
  }
): string {
  const name = options.actorName ?? "Someone";
  const doc = options.documentTitle ?? "this document";
  const status = (options.metadata?.newStatus ?? "")
    .toLowerCase()
    .replace("_", " ");
  const count = options.count ?? 1;

  if (count > 1 && (type === "COMMENT_ADDED" || type === "REPLY_ADDED")) {
    const verb = type === "REPLY_ADDED" ? "replied" : "commented";
    return scope === "global"
      ? `${name} ${verb} ${count} times on ${doc}`
      : `${name} ${verb} ${count} times`;
  }

  switch (type) {
    case "COMMENT_ADDED":
      return scope === "global" ? `${name} commented on ${doc}` : `${name} commented`;
    case "REPLY_ADDED":
      return scope === "global" ? `${name} replied on ${doc}` : `${name} replied`;
    case "STATUS_CHANGED":
      return scope === "global"
        ? `${doc} marked as ${status}`
        : `${name} marked as ${status}`;
    case "DOCUMENT_SHARED":
      return scope === "global"
        ? `${name} invited you to review ${doc}`
        : `${name} shared with ${options.metadata?.recipientName ?? "someone"}`;
    case "DOCUMENT_RENAMED":
      return scope === "global" ? `${doc} was renamed` : `${name} renamed this document`;
    case "DOCUMENT_UPLOADED":
      return scope === "global" ? `You uploaded ${doc}` : `${name} uploaded this document`;
    case "COLLABORATOR_REMOVED":
      return scope === "global"
        ? `${name} removed a reviewer from ${doc}`
        : `${name} removed ${options.metadata?.removedName ?? "a reviewer"}`;
    default:
      return scope === "global" ? `${name} performed an action on ${doc}` : `${name} performed an action`;
  }
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
