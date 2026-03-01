import { vi } from "vitest";

// Mock auth before any server code that imports it runs.
// This avoids loading NextAuth/next/server in the test environment.
vi.mock("workshop/server/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
