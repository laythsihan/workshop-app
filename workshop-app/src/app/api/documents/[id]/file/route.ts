import { NextResponse } from "next/server";
import { auth } from "workshop/server/auth";
import { db } from "workshop/server/db";
import { getSupabaseAdmin, STORAGE_BUCKET } from "workshop/server/supabase";

type Params = { params: Promise<{ id: string }> };

/** Returns the raw file for viewing (DOCX, PDF, etc.) with client-side renderers */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await db.document.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        {
          invitations: {
            some: {
              userId: session.user.id,
              status: "ACCEPTED",
            },
          },
        },
      ],
    },
    select: { storagePath: true, mimeType: true, filename: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(doc.storagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 }
    );
  }

  const buffer = await data.arrayBuffer();
  const filename = doc.filename ?? "document";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
