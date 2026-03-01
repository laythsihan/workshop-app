/**
 * Document router tests.
 *
 * Keep tests in sync with the router: when changing select shapes, orderBy, or
 * query structure in the document router, update the corresponding mock
 * assertions here in the same PR to avoid schema drift.
 */
import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  createTestCaller,
  createMockSession,
  createMockDocumentDb,
} from "../test-utils";

describe("document router", () => {
  describe("listMine", () => {
    it("throws UNAUTHORIZED when no session", async () => {
      const { caller } = createTestCaller({ session: null });

      await expect(caller.document.listMine()).rejects.toThrow(TRPCError);
      await expect(caller.document.listMine()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("returns empty array when user has no documents", async () => {
      const document = createMockDocumentDb();
      document.findMany.mockResolvedValue([]);

      const { caller } = createTestCaller({
        session: createMockSession(),
        document,
      });

      const result = await caller.document.listMine();

      expect(result).toEqual([]);
      expect(document.findMany).toHaveBeenCalledWith({
        where: { ownerId: "test-user-123" },
        orderBy: { createdAt: "desc" },
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
            select: { user: { select: { id: true, name: true, email: true } } },
            take: 4,
          },
        },
      });
    });

    it("returns user documents when they exist", async () => {
      const docs = [
        {
          id: "doc-1",
          title: "My Doc",
          filename: "doc.docx",
          status: "DRAFT",
          dueDate: null,
          createdAt: new Date("2026-02-13"),
        },
      ];

      const document = createMockDocumentDb();
      document.findMany.mockResolvedValue(docs);

      const { caller } = createTestCaller({
        session: createMockSession(),
        document,
      });

      const result = await caller.document.listMine();

      expect(result).toEqual(docs);
      expect(document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: "test-user-123" },
        })
      );
    });
  });

  describe("listReviewing", () => {
    it("throws UNAUTHORIZED when no session", async () => {
      const { caller } = createTestCaller({ session: null });

      await expect(caller.document.listReviewing()).rejects.toThrow(TRPCError);
      await expect(caller.document.listReviewing()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("returns documents user is invited to review", async () => {
      const docs = [
        {
          id: "doc-2",
          title: "Review Me",
          filename: "review.docx",
          status: "IN_REVIEW",
          mimeType: null,
          wordCount: null,
          genre: null,
          dueDate: null,
          createdAt: new Date("2026-02-12"),
          owner: { id: "owner-1", name: "Other User", email: "owner@example.com" },
          _count: { comments: 0 },
          invitations: [],
        },
      ];

      const { caller, mockDb } = createTestCaller({
        session: createMockSession(),
      });

      mockDb.invitation.findMany.mockResolvedValue(
        docs.map((document) => ({ document }))
      );

      const result = await caller.document.listReviewing();

      expect(result).toEqual(docs);
      expect(mockDb.invitation.findMany).toHaveBeenCalledWith({
        where: { userId: "test-user-123", status: "ACCEPTED" },
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
                select: { user: { select: { id: true, name: true, email: true } } },
                take: 4,
              },
            },
          },
        },
      });
    });
  });

  describe("delete", () => {
    it("throws UNAUTHORIZED when no session", async () => {
      const { caller } = createTestCaller({ session: null });

      await expect(
        caller.document.delete({ id: "clxyz123456789" })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.document.delete({ id: "clxyz123456789" })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws NOT_FOUND when document does not exist", async () => {
      const document = createMockDocumentDb();
      document.findFirst.mockResolvedValue(null);

      const { caller } = createTestCaller({
        session: createMockSession(),
        document,
      });

      await expect(
        caller.document.delete({ id: "clxyz12345678901234567890" })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.document.delete({ id: "clxyz12345678901234567890" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      expect(document.delete).not.toHaveBeenCalled();
    });

    it("deletes document when user owns it", async () => {
      const document = createMockDocumentDb();
      document.findFirst.mockResolvedValue({
        id: "clxyz12345678901234567890",
        storagePath: "user-id/uuid-file.docx",
      });
      document.delete.mockResolvedValue({});

      const { caller } = createTestCaller({
        session: createMockSession(),
        document,
      });

      const result = await caller.document.delete({
        id: "clxyz12345678901234567890",
      });

      expect(result).toEqual({ success: true });
      expect(document.findFirst).toHaveBeenCalledWith({
        where: {
          id: "clxyz12345678901234567890",
          ownerId: "test-user-123",
        },
      });
      expect(document.delete).toHaveBeenCalledWith({
        where: { id: "clxyz12345678901234567890" },
      });
    });
  });
});
