import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "../../generated/prisma";
import {
  generateInviteToken,
  verifyInviteToken,
  markInviteTokenUsed,
  InviteTokenAlreadyUsedError,
} from "./invite-token";

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock("workshop/server/db", () => ({
  db: {
    inviteTokenJti: {
      findUnique: (...args: unknown[]): ReturnType<typeof mockFindUnique> =>
        mockFindUnique(...args),
      create: (...args: unknown[]): ReturnType<typeof mockCreate> =>
        mockCreate(...args),
    },
  },
}));

describe("invite-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret-at-least-32-chars-long-for-hs256";
    mockFindUnique.mockResolvedValue(null); // Token not yet used
    mockCreate.mockResolvedValue(undefined); // markInviteTokenUsed succeeds
  });

  describe("generateInviteToken", () => {
    it("returns a non-empty JWT string", async () => {
      const token = await generateInviteToken({
        documentId: "doc-1",
        invitedById: "user-1",
      });
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("includes email in payload when provided", async () => {
      const token = await generateInviteToken({
        documentId: "doc-2",
        invitedById: "user-2",
        email: "guest@example.com",
      });
      const result = await verifyInviteToken(token);
      expect(result).toMatchObject({
        valid: true,
        payload: {
          documentId: "doc-2",
          invitedById: "user-2",
          email: "guest@example.com",
        },
      });
    });

    it("generates tokens that verify successfully", async () => {
      const token = await generateInviteToken({
        documentId: "doc-3",
        invitedById: "user-3",
      });
      const result = await verifyInviteToken(token);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.payload.documentId).toBe("doc-3");
        expect(result.payload.invitedById).toBe("user-3");
        expect(result.payload.jti).toBeTruthy();
        expect(result.payload.exp).toBeGreaterThan(Date.now() / 1000);
      }
    });
  });

  describe("verifyInviteToken", () => {
    it("returns invalid for malformed token", async () => {
      const result = await verifyInviteToken("not.a.valid.jwt");
      expect(result).toEqual({ valid: false, reason: "invalid" });
    });

    it("returns invalid for tampered token", async () => {
      const token = await generateInviteToken({
        documentId: "doc-1",
        invitedById: "user-1",
      });
      const [header, payload] = token.split(".");
      const tampered = `${header}.${payload}.wrongsignature`;
      const result = await verifyInviteToken(tampered);
      expect(result).toEqual({ valid: false, reason: "invalid" });
    });

    it("returns already_used when JTI is in the used table", async () => {
      const token = await generateInviteToken({
        documentId: "doc-4",
        invitedById: "user-4",
      });
      // First verify: findUnique returns null (token not used)
      const first = await verifyInviteToken(token);
      expect(first.valid).toBe(true);
      if (first.valid) {
        const jti = first.payload.jti;
        // Second verify: findUnique returns the record (token was marked used)
        mockFindUnique.mockResolvedValue({ jti });
        const second = await verifyInviteToken(token);
        expect(second).toMatchObject({ valid: false, reason: "already_used" });
        expect(second).toHaveProperty("payload");
        expect((second as { payload?: { documentId: string } }).payload?.documentId).toBe("doc-4");
      }
    });

  });

  describe("markInviteTokenUsed", () => {
    it("calls create with jti and documentId", async () => {
      mockCreate.mockResolvedValue(undefined);
      await markInviteTokenUsed({
        jti: "test-jti-123",
        documentId: "doc-5",
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          jti: "test-jti-123",
          documentId: "doc-5",
        },
      });
    });

    it("throws InviteTokenAlreadyUsedError when create hits unique constraint (P2002)", async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`jti`)",
        { code: "P2002", clientVersion: "test" }
      );
      mockCreate.mockRejectedValue(p2002);

      await expect(
        markInviteTokenUsed({ jti: "dupe-jti", documentId: "doc-6" })
      ).rejects.toThrow(InviteTokenAlreadyUsedError);
    });
  });

  describe("full flow", () => {
    it("generate -> verify -> mark used -> verify again returns already_used", async () => {
      const token = await generateInviteToken({
        documentId: "doc-flow",
        invitedById: "user-flow",
      });

      const before = await verifyInviteToken(token);
      expect(before.valid).toBe(true);

      if (!before.valid) return;
      const { jti, documentId } = before.payload;

      await markInviteTokenUsed({ jti, documentId });

      mockFindUnique.mockResolvedValue({ jti });
      const after = await verifyInviteToken(token);
      expect(after).toMatchObject({ valid: false, reason: "already_used" });
      expect(after).toHaveProperty("payload");
      expect((after as { payload?: { documentId: string } }).payload?.documentId).toBe("doc-flow");
    });
  });
});
