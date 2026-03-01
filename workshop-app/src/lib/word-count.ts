/**
 * Client-side word count extraction from supported file types.
 * Used in the upload form to show word count when a file is selected.
 * PDF word count is not supported client-side (Next.js/pdfjs-dist compatibility).
 */

import JSZip from "jszip";

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/** Extract text from .docx using JSZip (docx is a zip containing word/document.xml) */
async function extractTextFromDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  // <w:t> elements contain text; extract and join
  const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (!matches) return "";
  return matches
    .map((m) => m.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, "$1"))
    .join(" ");
}

/**
 * Get word count from a file. Returns null if format is unsupported or extraction fails.
 * Supported: .txt, .docx. .doc and .pdf return null (show "Word count unavailable" in UI).
 */
export async function getWordCount(file: File): Promise<number | null> {
  try {
    const ext = file.name.split(".").pop()?.toLowerCase();
    console.log('[WordCount] Processing file:', file.name, 'ext:', ext);
    let text: string;

    switch (ext) {
      case "txt":
        text = await file.text();
        break;
      case "docx":
        text = await extractTextFromDocx(file);
        console.log('[WordCount] Extracted DOCX text length:', text.length);
        break;
      case "doc":
      case "pdf":
        console.log('[WordCount] Unsupported format:', ext);
        return null; // .doc (legacy) and PDF need server-side or heavier libs
      default:
        console.log('[WordCount] Unknown format:', ext);
        return null;
    }

    const count = countWords(text);
    console.log('[WordCount] Word count result:', count);
    return count;
  } catch (err) {
    console.error('[WordCount] Error:', err);
    return null;
  }
}
