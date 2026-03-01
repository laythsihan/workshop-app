import { vi } from "vitest";
import { createCaller } from "workshop/server/api/root";

type MockSession = {
  user: { id: string; name?: string | null; email?: string | null };
  expires: string;
};

/**
 * Creates a mock Prisma document delegate for testing the document router.
 */
export function createMockDocumentDb() {
  return {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

/**
 * Creates a tRPC caller with mock db and session for testing.
 */
export function createTestCaller(opts: {
  session: MockSession | null;
  document?: ReturnType<typeof createMockDocumentDb>;
}) {
  const document = opts.document ?? createMockDocumentDb();

  const mockDb = {
    document,
    inviteTokenJti: { deleteMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    user: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    account: { findMany: vi.fn(), findFirst: vi.fn() },
    session: { findMany: vi.fn(), findFirst: vi.fn() },
    verificationToken: { findMany: vi.fn(), findFirst: vi.fn() },
    invitation: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    comment: { findMany: vi.fn() },
    documentViewer: { findMany: vi.fn() },
    notification: { findMany: vi.fn() },
  };

  const createContext = async () => ({
    db: mockDb,
    session: opts.session,
    headers: new Headers(),
  });

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument -- mock db for unit tests
    caller: createCaller(createContext as any),
    mockDb,
    document,
  };
}

/**
 * Default test user for authenticated tests.
 */
export const TEST_USER = {
  id: "test-user-123",
  name: "Test User",
  email: "test@example.com",
};

/**
 * Default mock session.
 */
export function createMockSession(overrides?: Partial<MockSession["user"]>) {
  return {
    user: { ...TEST_USER, ...overrides },
    expires: new Date(Date.now() + 86400 * 1000).toISOString(),
  } satisfies MockSession;
}
