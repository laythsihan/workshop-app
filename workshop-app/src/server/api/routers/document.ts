import { randomBytes } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  documentAccessProcedure,
} from "workshop/server/api/trpc";
import { generateInviteToken } from "workshop/server/invite-token";
import { getSupabaseAdmin } from "workshop/server/supabase";
import {
  sendDocumentInviteEmail,
  isValidEmail,
} from "workshop/server/email";

const genreSchema = z.enum([
  'SHORT_STORY',
  'NOVEL_EXCERPT',
  'PERSONAL_ESSAY',
  'LYRIC_ESSAY',
  'POETRY',
  'SCREENPLAY',
  'OTHER'
]).nullable();

export const documentRouter = createTRPCRouter({
  recent: protectedProcedure.query(async ({ ctx }) => {
    const recentViews = await ctx.db.documentViewer.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { viewedAt: "desc" },
      take: 5,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            filename: true,
          },
        },
      },
    });

    if (recentViews.length > 0) {
      return recentViews.map((v) => v.document);
    }

    const ownedDocs = await ctx.db.document.findMany({
      where: { ownerId: ctx.session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        filename: true,
      },
    });

    return ownedDocs;
  }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const searchTerm = input.query.toLowerCase();

      const docs = await ctx.db.document.findMany({
        where: {
          ownerId: ctx.session.user.id,
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { filename: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          filename: true,
        },
      });

      return docs;
    }),

  collaborators: documentAccessProcedure
    .input(z.object({ documentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const isUser = !!ctx.user;
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
            : ctx.guestSession?.documentId === input.documentId
              ? { id: input.documentId }
              : { id: "impossible" }),
        },
        select: {
          id: true,
          ownerId: true,
          owner: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
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

      const invitations = await ctx.db.invitation.findMany({
        where: {
          documentId: input.documentId,
          userId: { not: null },
          status: "ACCEPTED",
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const collaborators: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
        isOwner: boolean;
        isCurrentUser: boolean;
        isGuest?: boolean;
        invitationId?: string;
      }[] = [];

      collaborators.push({
        ...doc.owner,
        isOwner: true,
        isCurrentUser: isUser && doc.owner.id === ctx.user?.id,
      });

      for (const inv of invitations) {
        if (inv.user != null && inv.user.id !== doc.ownerId) {
          collaborators.push({
            ...inv.user,
            isOwner: false,
            isCurrentUser: isUser && inv.user.id === ctx.user?.id,
            invitationId: inv.id,
          });
        }
      }

      if (!isUser && ctx.guestSession) {
        const guest = await ctx.db.guest.findUnique({
          where: { id: ctx.guestSession.guestId },
          select: { id: true, displayName: true, email: true },
        });
        if (guest) {
          const name = guest.displayName?.trim() ?? "";
          collaborators.push({
            id: `guest-${guest.id}`,
            name,
            email: guest.email,
            image: null,
            isOwner: false,
            isCurrentUser: true,
            isGuest: true,
          });
        }
      }

      collaborators.sort((a, b) => {
        if (a.isOwner) return -1;
        if (b.isOwner) return 1;
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return 0;
      });

      const isDocumentOwner = isUser && doc.ownerId === ctx.user?.id;
      return { collaborators, isDocumentOwner };
    }),

  activity: documentAccessProcedure
    .input(z.object({ documentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const isUser = !!ctx.user;
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
            : ctx.guestSession?.documentId === input.documentId
              ? { id: input.documentId }
              : { id: "impossible" }),
        },
        select: { id: true },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
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

      const activities = await ctx.db.activityLog.findMany({
        where: {
          documentId: input.documentId,
          ...(isUser && ctx.user
            ? { userId: { not: ctx.user.id } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: {
            select: { id: true, name: true, displayName: true, email: true, image: true },
          },
        },
      });

      return activities;
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const docs = await ctx.db.document.findMany({
      where: { ownerId: ctx.session.user.id },
      select: {
        id: true,
        title: true,
        filename: true,
        status: true,
        mimeType: true,
        wordCount: true,
        genre: true,
        createdAt: true,
        dueDate: true,
        _count: { select: { comments: true } },
        invitations: {
          where: { userId: { not: null } },
          select: {
            user: { select: { id: true, name: true, email: true } },
          },
          take: 4,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return docs;
  }),

  listReviewing: protectedProcedure.query(async ({ ctx }) => {
    const invitations = await ctx.db.invitation.findMany({
      where: { userId: ctx.session.user.id, status: "ACCEPTED" },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            filename: true,
            status: true,
            mimeType: true,
            wordCount: true,
            genre: true,
            createdAt: true,
            dueDate: true,
            owner: { select: { id: true, name: true, email: true } },
            _count: { select: { comments: true } },
            invitations: {
              where: { userId: { not: null } },
              select: {
                user: { select: { id: true, name: true, email: true } },
              },
              take: 4,
            },
          },
        },
      },
    });

    return invitations.map((inv) => inv.document);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: ctx.session.user.id },
            {
              invitations: {
                some: {
                  userId: ctx.session.user.id,
                  status: "ACCEPTED",
                },
              },
            },
          ],
        },
        include: {
          owner: { select: { name: true } },
        },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return doc;
    }),

  getShareLink: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.id, ownerId: ctx.session.user.id },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const token = await generateInviteToken({
        documentId: doc.id,
        invitedById: ctx.session.user.id,
      });

      return { shareUrl: `/documents/${doc.id}?invite=${token}` };
    }),

  inviteByEmail: protectedProcedure
    .input(
      z.object({
        documentId: z.string().cuid(),
        emails: z.array(z.string().min(1)).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.documentId, ownerId: ctx.session.user.id },
        select: { id: true, title: true },
      });
      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const normalized = input.emails
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const deduped = [...new Set(normalized)];

      const invalid: string[] = [];
      const valid: string[] = [];
      for (const e of deduped) {
        if (isValidEmail(e)) valid.push(e);
        else invalid.push(e);
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [perDocToday, perUserToday] = await Promise.all([
        ctx.db.invitation.count({
          where: {
            documentId: input.documentId,
            email: { not: null },
            createdAt: { gte: startOfToday },
          },
        }),
        ctx.db.invitation.count({
          where: {
            invitedById: ctx.session.user.id,
            email: { not: null },
            createdAt: { gte: startOfToday },
          },
        }),
      ]);

      const LIMIT_PER_DOC = 20;
      const LIMIT_PER_USER = 50;
      if (
        perDocToday + valid.length > LIMIT_PER_DOC ||
        perUserToday + valid.length > LIMIT_PER_USER
      ) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "You've reached the invite limit for today. Try again tomorrow.",
        });
      }

      const owner = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { name: true, displayName: true },
      });
      const inviterName =
        owner?.displayName ?? owner?.name ?? "Someone";
      const baseUrl =
        process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
      const documentTitle = doc.title ?? "Untitled";

      const sent: string[] = [];
      const alreadyInvited: string[] = [];
      const failed: string[] = [];

      for (const email of valid) {
        const existing = await ctx.db.invitation.findFirst({
          where: {
            documentId: input.documentId,
            email,
          },
        });
        if (existing) {
          if (existing.status === "PENDING" || existing.status === "ACCEPTED") {
            alreadyInvited.push(email);
            continue;
          }
          // REVOKED (or other): re-invite by updating the existing record
          const token = randomBytes(32).toString("hex");
          const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          await ctx.db.invitation.update({
            where: { id: existing.id },
            data: {
              status: "PENDING",
              token,
              expiresAt,
              revokedAt: null,
              invitedById: ctx.session.user.id,
            },
          });
          const claimUrl = `${baseUrl}/invite/${token}`;
          const result = await sendDocumentInviteEmail(
            email,
            inviterName,
            documentTitle,
            claimUrl
          );
          if (result.success) {
            sent.push(email);
          } else {
            failed.push(email);
          }
          continue;
        }

        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        await ctx.db.invitation.create({
          data: {
            documentId: input.documentId,
            email,
            invitedById: ctx.session.user.id,
            status: "PENDING",
            token,
            expiresAt,
          },
        });

        const claimUrl = `${baseUrl}/invite/${token}`;
        const result = await sendDocumentInviteEmail(
          email,
          inviterName,
          documentTitle,
          claimUrl
        );
        if (result.success) {
          sent.push(email);
        } else {
          failed.push(email);
        }
      }

      return { sent, alreadyInvited, invalid, failed };
    }),

  resendInvite: protectedProcedure
    .input(z.object({ invitationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await ctx.db.invitation.findFirst({
        where: { id: input.invitationId },
        include: {
          document: {
            select: { id: true, title: true, ownerId: true },
          },
          invitedBy: { select: { name: true, displayName: true } },
        },
      });
      if (!inv || inv.document.ownerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }
      if (inv.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot resend an accepted invitation",
        });
      }
      if (inv.resendCount >= 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Resend limit reached",
        });
      }

      const newToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: { token: newToken, expiresAt, resendCount: inv.resendCount + 1 },
      });

      const baseUrl =
        process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
      const claimUrl = `${baseUrl}/invite/${newToken}`;
      const inviterName =
        inv.invitedBy?.displayName ?? inv.invitedBy?.name ?? "Someone";
      const documentTitle = inv.document.title ?? "Untitled";
      const to = inv.email!;
      await sendDocumentInviteEmail(to, inviterName, documentTitle, claimUrl);

      return { success: true };
    }),

  cancelInvite: protectedProcedure
    .input(z.object({ invitationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await ctx.db.invitation.findFirst({
        where: { id: input.invitationId },
        include: {
          document: { select: { id: true, ownerId: true } },
        },
      });
      if (!inv || inv.document.ownerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }
      if (inv.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel an accepted invitation",
        });
      }
      await ctx.db.invitation.delete({
        where: { id: input.invitationId },
      });
      return { success: true };
    }),

  removeCollaborator: protectedProcedure
    .input(z.object({ invitationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await ctx.db.invitation.findFirst({
        where: { id: input.invitationId },
        include: {
          document: {
            select: { id: true, ownerId: true },
          },
          user: { select: { id: true, name: true, email: true, displayName: true } },
        },
      });
      if (!inv || inv.document.ownerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }
      if (inv.status !== "ACCEPTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only accepted reviewers can be removed. Use cancel invite for pending invitations.",
        });
      }

      const now = new Date();
      await ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: { status: "REVOKED", revokedAt: now },
      });

      const reviewerLabel =
        inv.user?.displayName ?? inv.user?.name ?? inv.user?.email ?? inv.email ?? "A reviewer";
      await ctx.db.activityLog.create({
        data: {
          type: "COLLABORATOR_REMOVED",
          documentId: inv.document.id,
          userId: ctx.session.user.id,
          metadata: { removedName: reviewerLabel },
        },
      });

      return { success: true };
    }),

  listInvitations: protectedProcedure
    .input(z.object({ documentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.documentId, ownerId: ctx.session.user.id },
        select: { id: true },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const invitations = await ctx.db.invitation.findMany({
        where: {
          documentId: input.documentId,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      return invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        resendCount: inv.resendCount,
        userId: inv.userId,
        user: inv.user
          ? {
              id: inv.user.id,
              name: inv.user.name,
              email: inv.user.email,
              image: inv.user.image,
            }
          : null,
      }));
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        title: z.string().min(1).optional(),
        genre: genreSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.id, ownerId: ctx.session.user.id },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const updated = await ctx.db.document.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.genre !== undefined && { genre: input.genre }),
        },
        select: {
          id: true,
          title: true,
          filename: true,
          genre: true,
        },
      });

      if (input.title !== undefined) {
        await ctx.db.activityLog.create({
          data: {
            type: "DOCUMENT_RENAMED",
            documentId: input.id,
            userId: ctx.session.user.id,
          },
        });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.id, ownerId: ctx.session.user.id },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.storage.from("documents").remove([doc.storagePath]);
      }

      await ctx.db.inviteTokenJti.deleteMany({ where: { documentId: input.id } });
      await ctx.db.document.delete({ where: { id: input.id } });

      return { success: true };
    }),

  markComplete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.id, ownerId: ctx.session.user.id },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have permission",
        });
      }

      await ctx.db.document.update({
        where: { id: input.id },
        data: { status: "COMPLETED" },
      });

      await ctx.db.activityLog.create({
        data: {
          type: "STATUS_CHANGED",
          documentId: input.id,
          userId: ctx.session.user.id,
          metadata: { newStatus: "COMPLETED" },
        },
      });

      return { success: true };
    }),

  markReopen: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findFirst({
        where: { id: input.id, ownerId: ctx.session.user.id },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you don't have permission",
        });
      }

      await ctx.db.document.update({
        where: { id: input.id },
        data: { status: "IN_REVIEW" },
      });

      await ctx.db.activityLog.create({
        data: {
          type: "STATUS_CHANGED",
          documentId: input.id,
          userId: ctx.session.user.id,
          metadata: { newStatus: "IN_REVIEW" },
        },
      });

      return { success: true };
    }),
});
