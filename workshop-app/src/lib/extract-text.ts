/**
 * Server-side text extraction from document buffers.
 * Used by the content API for unified display of TXT, DOCX, DOC, PDF.
 *
 * Returns text and page break indices (character offset where each page starts).
 * Page breaks enable document-like formatting; canonical text is preserved for
 * comment offset/anchoring.
 */
import "server-only";

/**
 * Conservative chars per page so content fits in a fixed-height container.
 * Formatted text (headings, lists, short paragraphs) uses more vertical space
 * per character than dense prose, so we use a lower count to avoid overflow.
 */
const CHARS_PER_PAGE_ESTIMATE = 1400;

export type ExtractedContent = {
  text: string;
  /** Character indices where each page starts. pageStarts[0]=0, pageStarts[i]=start of page i+1 */
  pageStarts: number[];
};

function estimatePageBreaks(text: string): number[] {
  const starts: number[] = [0];
  let pos = CHARS_PER_PAGE_ESTIMATE;
  while (pos < text.length) {
    const nextNewline = text.indexOf("\n", pos);
    const breakAt = nextNewline >= 0 ? nextNewline + 1 : pos;
    starts.push(breakAt);
    pos = breakAt + CHARS_PER_PAGE_ESTIMATE;
  }
  return starts;
}

/** Extract text and page structure from a buffer based on MIME type */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedContent> {
  const type = mimeType.toLowerCase();
  let text: string;
  let pageStarts: number[];

  if (type === "text/plain") {
    text = buffer.toString("utf-8");
    pageStarts = estimatePageBreaks(text);
  } else if (
    type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const officeParser = await import("officeparser");
    const ast = await officeParser.parseOffice(buffer);
    text = ast.toText() ?? "";
    pageStarts = estimatePageBreaks(text);
  } else if (type === "application/msword") {
    // Legacy .doc - OfficeParser may not support; use Mammoth
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    text = result.value ?? "";
    pageStarts = estimatePageBreaks(text);
  } else if (type === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      text = result.text ?? "";
      pageStarts = [0];
      if (result.pages?.length) {
        let cumulative = 0;
        for (let i = 0; i < result.pages.length - 1; i++) {
          cumulative += (result.pages[i]?.text ?? "").length;
          pageStarts.push(cumulative);
        }
      }
      if (pageStarts.length === 1 && text.length > CHARS_PER_PAGE_ESTIMATE) {
        pageStarts = estimatePageBreaks(text);
      }
    } finally {
      await parser.destroy();
    }
  } else {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  return { text: text ?? "", pageStarts: pageStarts ?? [0] };
}
