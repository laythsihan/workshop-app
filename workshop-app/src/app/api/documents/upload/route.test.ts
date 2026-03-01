import { describe, it, expect, beforeEach, vi } from "vitest";
import { auth } from "workshop/server/auth";

// Mock db and supabase before importing the route
vi.mock("workshop/server/db", () => ({
  db: {
    document: {
      create: vi.fn().mockResolvedValue({
        id: "doc-123",
        filename: "test.docx",
        status: "DRAFT",
      }),
    },
  },
}));

vi.mock("workshop/server/supabase", () => ({
  getSupabaseAdmin: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  }),
  STORAGE_BUCKET: "documents",
}));

// Import route after mocks are in place
const { POST } = await import("./route");

describe("POST /api/documents/upload", () => {
  beforeEach(() => {
    // @ts-expect-error - auth mock resolved value; TS confuses with route handler type
    vi.mocked(auth).mockResolvedValue(null);
  });

  function createRequest(opts: {
    title?: string;
    file?: { name: string; type: string; content: string };
  }) {
    const formData = new FormData();
    if (opts.title !== undefined) formData.set("title", opts.title);
    if (opts.file) {
      const blob = new Blob([opts.file.content], { type: opts.file.type });
      formData.set("file", blob, opts.file.name);
    }
    return new Request("http://localhost/api/documents/upload", {
      method: "POST",
      body: formData,
    });
  }

  it("returns 401 when not authenticated", async () => {
    // @ts-expect-error - auth mock resolved value
    vi.mocked(auth).mockResolvedValue(null);

    const req = createRequest({
      title: "Test Doc",
      file: { name: "test.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", content: "x" },
    });

    const res = await POST(req);
    const data = (await res.json()) as { error?: string };

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when title is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: new Date().toISOString(),
    } as never);

    const req = createRequest({
      file: { name: "test.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", content: "x" },
    });

    const res = await POST(req);
    const data = (await res.json()) as { error?: string };

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Document name is required" });
  });

  it("returns 400 when title is empty string", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: new Date().toISOString(),
    } as never);

    const req = createRequest({
      title: "   ",
      file: { name: "test.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", content: "x" },
    });

    const res = await POST(req);
    const data = (await res.json()) as { error?: string };

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Document name is required" });
  });

  it("returns 400 when file is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: new Date().toISOString(),
    } as never);

    const formData = new FormData();
    formData.set("title", "Test Doc");

    const req = new Request("http://localhost/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    const data = (await res.json()) as { error?: string };

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Please select a file to upload." });
  });
});
