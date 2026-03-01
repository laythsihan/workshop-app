import mammoth from "mammoth";

/**
 * Convert .doc/.docx buffer to HTML for display in the document viewer.
 * Used on the viewer page when rendering Word documents.
 *
 * @param buffer - Raw file bytes (e.g. from Supabase Storage)
 * @returns HTML string and optional messages (e.g. warnings)
 */
export async function docxToHtml(buffer: Buffer): Promise<{
  value: string;
  messages: Array<{ type: string; message: string }>;
}> {
  const result = await mammoth.convertToHtml({ buffer });
  return { value: result.value, messages: result.messages };
}
