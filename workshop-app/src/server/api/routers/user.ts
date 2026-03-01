import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "workshop/server/api/trpc";

const VERIFY_PASSWORD_ATTEMPTS_PER_HOUR = 10;

export const userRouter = createTRPCRouter({
  hasPassword: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { password: true },
    });
    return { hasPassword: !!user?.password };
  }),

  verifyPassword: protectedProcedure
    .input(z.object({ password: z.string().min(1, "Password is required") }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const attemptCount = await ctx.db.passwordVerifyAttempt.count({
        where: {
          userId,
          createdAt: { gte: oneHourAgo },
        },
      });
      if (attemptCount >= VERIFY_PASSWORD_ATTEMPTS_PER_HOUR) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Please try again later.",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      const valid =
        !!user?.password &&
        (await bcrypt.compare(input.password, user.password));

      await ctx.db.passwordVerifyAttempt.create({
        data: { userId },
      });

      return { valid };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        displayName: true,
        accountType: true,
        pendingDeletion: true,
        deletionScheduledAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  update: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(1, "Name cannot be empty")
          .max(100, "Name must be 100 characters or less")
          .optional(),
        displayName: z
          .string()
          .min(1, "Display name cannot be empty")
          .max(50, "Display name must be 50 characters or less")
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: { name?: string; displayName?: string } = {};

      if (input.name !== undefined) {
        updateData.name = input.name;
      }
      if (input.displayName !== undefined) {
        updateData.displayName = input.displayName;
      }

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fields to update",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          displayName: true,
        },
      });

      return updatedUser;
    }),

  scheduleDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        pendingDeletion: true,
        ownedDocuments: {
          select: {
            id: true,
            title: true,
            filename: true,
            invitations: {
              where: { status: "ACCEPTED", userId: { not: null } },
              select: { user: { select: { email: true } } },
            },
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    if (user.pendingDeletion) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Account is already scheduled for deletion",
      });
    }

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 7);

    await ctx.db.user.update({
      where: { id: userId },
      data: {
        pendingDeletion: true,
        deletionScheduledAt: deletionDate,
      },
    });

    const { sendAccountDeletionNotificationToCollaborators } = await import(
      "workshop/server/email"
    );

    const sharedDocs = user.ownedDocuments.filter(
      (d) => d.invitations.length > 0
    );
    const collaboratorEmails = [
      ...new Set(
        sharedDocs.flatMap((d) =>
          d.invitations
            .map((i) => i.user?.email)
            .filter((e): e is string => !!e)
        )
      ),
    ];

    if (collaboratorEmails.length > 0) {
      const titles = sharedDocs.map(
        (d) => d.title ?? d.filename ?? "Untitled document"
      );
      await sendAccountDeletionNotificationToCollaborators(
        collaboratorEmails,
        titles,
        user.name ?? "A document owner"
      );
    }

    console.log(`[AccountDeletion] Scheduled for user ${userId} at ${deletionDate.toISOString()}`);

    return {
      success: true,
      deletionScheduledAt: deletionDate,
    };
  }),

  cancelDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { pendingDeletion: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    if (!user.pendingDeletion) {
      return { success: true };
    }

    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: {
        pendingDeletion: false,
        deletionScheduledAt: null,
      },
    });

    console.log(`[AccountDeletion] Cancelled for user ${ctx.session.user.id}`);

    return { success: true };
  }),

  getSharedDocumentCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.document.count({
      where: {
        ownerId: ctx.session.user.id,
        invitations: {
          some: { status: "ACCEPTED", userId: { not: null } },
        },
      },
    });
    return count;
  }),
});
