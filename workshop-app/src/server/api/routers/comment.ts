import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  documentAccessProcedure,
} from "workshop/server/api/trpc";

type AuthorLike = { id: string; name: string | null; displayName: string | null } | null;
type GuestLike = { id: string; displayName: string | null; email: string } | null;

function toUserShape(
  author: AuthorLike,
  guest: GuestLike,
  deletedName: string | null
) {
  if (author) {
    return { id: author.id, name: author.name, displayName: author.displayName };
  }
  if (guest) {
    const name = guest.displayName?.trim() ?? "";
    return { id: `guest-${guest.id}` as const, name, displayName: name };
  }
  return { id: "__deleted__" as const, name: deletedName ?? "Deleted User", displayName: deletedName ?? "Deleted User" };
}

export const commentRouter = createTRPCRouter({
  list: documentAccessProcedure
    .input(z.object({ documentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const isUser = !!ctx.user;
      const isGuest = !!ctx.guestSession;

      const doc = await ctx.db.document.findFirst({
        where: {
          id: input.documentId,
          ...(isUser && ctx.user
            ? {
                OR: [
                  { ownerId: ctx.user.id },
                  {
                    invitations: {
                      some: {
                        userId: ctx.user.id,
                        status: "ACCEPTED",
                      },
                    },
                  },
                ],
              }
            : isGuest && ctx.guestSession?.documentId === input.documentId
              ? { id: input.documentId }
              : { id: "impossible" }),
        },
        select: { id: true },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have access",
        });
      }

      if (isGuest && ctx.guestSession) {
        const guest = await ctx.db.guest.findUnique({
          where: { id: ctx.guestSession.guestId },
          select: { email: true },
        });
        if (guest) {
          const revoked = await ctx.db.invitation.findFirst({
            where: {
              documentId: input.documentId,
              email: guest.email,
              status: "REVOKED",
            },
          });
          if (revoked) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Your access to this document has been removed",
            });
          }
        }
      }

      const comments = await ctx.db.comment.findMany({
        where: { documentId: input.documentId, parentCommentId: null },
        include: {
          author: { select: { id: true, name: true, displayName: true } },
          guest: { select: { id: true, displayName: true, email: true } },
          replies: {
            include: {
              author: { select: { id: true, name: true, displayName: true } },
              guest: { select: { id: true, displayName: true, email: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return comments.map((c) => ({
        ...c,
        user: toUserShape(c.author, c.guest, c.deletedAuthorDisplayName),
        replies: c.replies.map((r) => ({
          ...r,
          user: toUserShape(r.author, r.guest, r.deletedAuthorDisplayName),
        })),
      }));
    }),

  create: documentAccessProcedure
    .input(
      z.object({
        documentId: z.string().cuid(),
        content: z.string().min(1),
        highlightedText: z.string().optional(),
        positionData: z
          .object({
            startOffset: z.number().optional(),
            endOffset: z.number().optional(),
            selectedText: z.string().optional(),
          })
          .optional(),
        parentId: z.string().cuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isUser = !!ctx.user;
      const isGuest = !!ctx.guestSession;

      const doc = await ctx.db.document.findFirst({
        where: {
          id: input.documentId,
          ...(isUser && ctx.user
            ? {
                OR: [
                  { ownerId: ctx.user.id },
                  {
                    invitations: {
                      some: {
                        userId: ctx.user.id,
                        status: "ACCEPTED",
                      },
                    },
                  },
                ],
              }
            : isGuest && ctx.guestSession?.documentId === input.documentId
              ? { id: input.documentId }
              : { id: "impossible" }),
        },
        select: { id: true, status: true },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have access",
        });
      }

      if (isGuest && ctx.guestSession) {
        const guest = await ctx.db.guest.findUnique({
          where: { id: ctx.guestSession.guestId },
          select: { email: true },
        });
        if (guest) {
          const revoked = await ctx.db.invitation.findFirst({
            where: {
              documentId: input.documentId,
              email: guest.email,
              status: "REVOKED",
            },
          });
          if (revoked) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Your access to this document has been removed",
            });
          }
        }
      }

      if (doc.status === "COMPLETED") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This piece has been closed. Commenting is no longer allowed.",
        });
      }

      const authorOrGuest =
        isUser && ctx.user
          ? { authorId: ctx.user.id }
          : ctx.guestSession
            ? { guestId: ctx.guestSession.guestId }
            : null;
      if (!authorOrGuest) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Missing session",
        });
      }
      const comment = await ctx.db.comment.create({
        data: {
          content: input.content,
          highlightedText: input.highlightedText,
          positionData: input.positionData ?? undefined,
          documentId: input.documentId,
          ...authorOrGuest,
          parentCommentId: input.parentId,
        },
        include: {
          author: { select: { id: true, name: true, displayName: true } },
          guest: { select: { id: true, displayName: true, email: true } },
        },
      });

      if (isUser && ctx.user) {
        await ctx.db.activityLog.create({
          data: {
            type: input.parentId ? "REPLY_ADDED" : "COMMENT_ADDED",
            documentId: input.documentId,
            userId: ctx.user.id,
            commentId: comment.id,
          },
        });
      }

      return {
        ...comment,
        user: toUserShape(comment.author, comment.guest, null),
      };
    }),

  update: documentAccessProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isUser = !!ctx.user;
      const comment = await ctx.db.comment.findFirst({
        where: {
          id: input.id,
          ...(isUser && ctx.user
            ? { authorId: ctx.user.id }
            : ctx.guestSession
              ? { guestId: ctx.guestSession.guestId }
              : { authorId: "impossible" }),
        },
        include: {
          author: { select: { id: true, name: true, displayName: true } },
          guest: { select: { id: true, displayName: true, email: true } },
        },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found or you don't have permission to edit it",
        });
      }

      if (!isUser && ctx.guestSession && comment.documentId !== ctx.guestSession.documentId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit comments on the document you have access to",
        });
      }
      if (!isUser && ctx.guestSession) {
        const guest = await ctx.db.guest.findUnique({
          where: { id: ctx.guestSession.guestId },
          select: { email: true },
        });
        if (guest) {
          const revoked = await ctx.db.invitation.findFirst({
            where: {
              documentId: comment.documentId,
              email: guest.email,
              status: "REVOKED",
            },
          });
          if (revoked) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Your access to this document has been removed",
            });
          }
        }
      }

      const updated = await ctx.db.comment.update({
        where: { id: input.id },
        data: { content: input.content },
        include: {
          author: { select: { id: true, name: true, displayName: true } },
          guest: { select: { id: true, displayName: true, email: true } },
        },
      });

      return {
        ...updated,
        user: toUserShape(updated.author, updated.guest, null),
      };
    }),

  delete: documentAccessProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const isUser = !!ctx.user;
      const comment = await ctx.db.comment.findFirst({
        where: {
          id: input.id,
          ...(isUser && ctx.user
            ? { authorId: ctx.user.id }
            : ctx.guestSession
              ? { guestId: ctx.guestSession.guestId }
              : { authorId: "impossible" }),
        },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found or you don't have permission to delete it",
        });
      }

      if (!isUser && ctx.guestSession && comment.documentId !== ctx.guestSession.documentId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete comments on the document you have access to",
        });
      }
      if (!isUser && ctx.guestSession) {
        const guest = await ctx.db.guest.findUnique({
          where: { id: ctx.guestSession.guestId },
          select: { email: true },
        });
        if (guest) {
          const revoked = await ctx.db.invitation.findFirst({
            where: {
              documentId: comment.documentId,
              email: guest.email,
              status: "REVOKED",
            },
          });
          if (revoked) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Your access to this document has been removed",
            });
          }
        }
      }

      await ctx.db.comment.delete({ where: { id: input.id } });

      return { success: true };
    }),
});
