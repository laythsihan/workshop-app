import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "workshop/server/auth";
import { db } from "workshop/server/db";
import { generateInviteToken } from "workshop/server/invite-token";
import { getSupabaseAdmin, STORAGE_BUCKET } from "workshop/server/supabase";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

type DocumentGenre = 'SHORT_STORY' | 'NOVEL_EXCERPT' | 'PERSONAL_ESSAY' | 'LYRIC_ESSAY' | 'POETRY' | 'SCREENPLAY' | 'OTHER';

const VALID_GENRES: DocumentGenre[] = [
  'SHORT_STORY',
  'NOVEL_EXCERPT',
  'PERSONAL_ESSAY',
  'LYRIC_ESSAY',
  'POETRY',
  'SCREENPLAY',
  'OTHER'
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const title = formData.get("title");
  const file = formData.get("file");
  const wordCountStr = formData.get("wordCount");
  const genreStr = formData.get("genre");

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json(
      { error: "Document name is required" },
      { status: 400 }
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Please select a file to upload." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a .doc, .docx, .pdf, or .txt file." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }

  // Generate unique storage path
  const ext = file.name.split(".").pop() ?? "bin";
  const storagePath = `${session.user.id}/${randomBytes(16).toString("hex")}.${ext}`;

  // Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }

  // Use client-provided word count, or estimate for txt files
  let wordCount = 0;
  console.log('[Upload API] Received wordCountStr:', wordCountStr);
  if (wordCountStr && typeof wordCountStr === "string") {
    const parsed = parseInt(wordCountStr, 10);
    console.log('[Upload API] Parsed word count:', parsed);
    if (!isNaN(parsed) && parsed >= 0) {
      wordCount = parsed;
    }
  } else if (file.type === "text/plain") {
    const text = await file.text();
    wordCount = text.split(/\s+/).filter(Boolean).length;
  }
  console.log('[Upload API] Final word count:', wordCount);

  // Validate genre if provided
  let genre: DocumentGenre | null = null;
  if (genreStr && typeof genreStr === "string" && VALID_GENRES.includes(genreStr as DocumentGenre)) {
    genre = genreStr as DocumentGenre;
  }

  // Create document record
  const doc = await db.document.create({
    data: {
      title: title.trim(),
      filename: file.name,
      mimeType: file.type,
      storagePath,
      wordCount,
      genre,
      ownerId: session.user.id,
      status: "DRAFT",
    },
  });

  await db.activityLog.create({
    data: {
      type: "DOCUMENT_UPLOADED",
      documentId: doc.id,
      userId: session.user.id,
    },
  });

  const inviteToken = await generateInviteToken({
    documentId: doc.id,
    invitedById: session.user.id,
  });
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const shareUrl = `${baseUrl}/documents/${doc.id}?invite=${inviteToken}`;

  return NextResponse.json({
    id: doc.id,
    shareUrl,
  });
}
