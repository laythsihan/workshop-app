import {
  createTRPCRouter,
  protectedProcedure,
} from "workshop/server/api/trpc";

const ACTIVITY_FEED_LIMIT = 20;
const DEDUPE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export type GlobalActivityItem = {
  id: string;
  type: string;
  documentId: string;
  documentTitle: string;
  actorName: string | null;
  actorImage: string | null;
  commentId: string | null;
  createdAt: Date;
  count: number;
  metadata?: { newStatus?: string; recipientName?: string } | null;
};

// TODO: The activity feed and notification system may eventually converge. When
// adding or changing activity logging, consider whether a corresponding
// Notification should also be created for the relevant user(s).
export const activityRouter = createTRPCRouter({
  recentForUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [activityLogs, ownedCount] = await Promise.all([
      ctx.db.activityLog.findMany({
        where: {
          userId: { not: userId },
          document: {
            OR: [
              { ownerId: userId },
              {
                invitations: {
                  some: { userId, status: "ACCEPTED" },
                },
              },
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          document: { select: { id: true, title: true } },
          user: { select: { id: true, name: true, displayName: true, image: true } },
        },
      }),
      ctx.db.document.count({ where: { ownerId: userId } }),
    ]);

    const logItems: GlobalActivityItem[] = activityLogs.map((a) => ({
      id: a.id,
      type: a.type,
      documentId: a.document.id,
      documentTitle: a.document.title ?? a.document.id,
      actorName: a.user?.displayName ?? a.user?.name ?? "Deleted User",
      actorImage: a.user?.image ?? null,
      commentId: a.commentId ?? null,
      createdAt: a.createdAt,
      count: 1,
      metadata: a.metadata as { newStatus?: string; recipientName?: string } | null,
      _userId: a.userId,
      _documentId: a.documentId,
    }));

    const merged = logItems.map((item) => ({ ...item, _source: "log" as const }));

    const deduped: GlobalActivityItem[] = [];
    for (let i = 0; i < merged.length; i++) {
      const curr = merged[i];
      if (!curr) continue;
      const currLog = curr as typeof curr & { _userId: string | null; _documentId: string };
      let count = 1;
      let groupNewestId = curr.id;
      let groupNewestCommentId = curr.commentId;
      let groupNewestCreatedAt = curr.createdAt.getTime();
      while (i + 1 < merged.length) {
        const nextRaw = merged[i + 1];
        if (nextRaw?._source !== "log") break;
        const next = nextRaw as typeof curr & { _userId: string | null; _documentId: string };
        const nextTime = next.createdAt.getTime();
        if (
          next.type === currLog.type &&
          next._userId === currLog._userId &&
          next._documentId === currLog._documentId &&
          groupNewestCreatedAt - nextTime <= DEDUPE_WINDOW_MS
        ) {
          count++;
          i++;
          groupNewestId = next.id;
          groupNewestCommentId = next.commentId;
          groupNewestCreatedAt = Math.max(groupNewestCreatedAt, nextTime);
        } else {
          break;
        }
      }
      deduped.push({
        id: groupNewestId,
        type: curr.type,
        documentId: curr.documentId,
        documentTitle: curr.documentTitle,
        actorName: curr.actorName,
        actorImage: curr.actorImage,
        commentId: groupNewestCommentId,
        createdAt: curr.createdAt,
        count,
        metadata: curr.metadata,
      });
    }

    const items = deduped.slice(0, ACTIVITY_FEED_LIMIT);

    return {
      items,
      hasDocuments: ownedCount > 0,
    };
  }),
});
