import { NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "workshop/server/auth";
import { db } from "workshop/server/db";
import { getSupabaseAdmin, STORAGE_BUCKET } from "workshop/server/supabase";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 503 }
    );
  }

  const docs = await db.document.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, storagePath: true, filename: true, title: true },
  });

  const zip = new JSZip();

  for (const doc of docs) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(doc.storagePath);

    if (error || !data) continue;

    const buffer = await data.arrayBuffer();
    const filename = doc.filename ?? doc.title ?? `document-${doc.id}`;
    zip.file(filename, buffer);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const date = new Date().toISOString().slice(0, 10);
  const zipFilename = `workshop-export-${date}.zip`;

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
    },
  });
}
