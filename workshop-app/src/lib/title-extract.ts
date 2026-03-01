/**
 * Client-side title extraction from supported file types.
 * Used in the upload form to suggest a title when a file is selected.
 */

import JSZip from "jszip";

export type TitleExtractionResult = {
  title: string;
  source: "document" | "filename";
};

const MAX_TITLE_LENGTH = 200;
const MAX_FIRST_LINE_LENGTH = 80;

/**
 * Check if a string contains only punctuation or numeric characters.
 * These are invalid as titles and should fall through to next rule.
 */
function isInvalidTitle(text: string): boolean {
  if (!text.trim()) return true;
  // Only punctuation, numbers, or whitespace
  return /^[\d\s\p{P}]+$/u.test(text.trim());
}

/**
 * Clean and normalize extracted title text.
 */
function cleanTitle(text: string): string {
  // Trim and collapse internal whitespace
  let cleaned = text.trim().replace(/\s+/g, " ");
  
  // Truncate if too long
  if (cleaned.length > MAX_TITLE_LENGTH) {
    cleaned = cleaned.substring(0, MAX_TITLE_LENGTH).trim() + "…";
  }
  
  return cleaned;
}

/**
 * Convert filename to title case, replacing underscores and hyphens with spaces.
 */
function fileNameToTitle(filename: string): string {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  // Replace underscores and hyphens with spaces
  const withSpaces = nameWithoutExt.replace(/[_-]+/g, " ");
  
  // Title case: capitalize first letter of each word
  const titleCased = withSpaces
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  
  return cleanTitle(titleCased);
}

/**
 * Extract first non-empty line from text content.
 * Returns null if line is too long (likely a body paragraph) or invalid.
 */
function extractFirstLine(text: string): string | null {
  const lines = text.split(/\r?\n/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Skip if too long (likely body text, not a title)
    if (trimmed.length > MAX_FIRST_LINE_LENGTH) {
      return null;
    }
    
    // Skip if invalid (only punctuation/numbers)
    if (isInvalidTitle(trimmed)) {
      continue;
    }
    
    return cleanTitle(trimmed);
  }
  
  return null;
}

/**
 * Parse DOCX XML to find paragraphs with specific styles.
 * Returns the text of the first paragraph matching the target style.
 */
function findStyledParagraph(xml: string, styleNames: string[]): string | null {
  // DOCX stores styles in document.xml with references to styles.xml
  // We look for <w:pStyle w:val="..."/> within <w:pPr> of paragraphs
  
  // Split by paragraph markers
  const paragraphs = xml.split(/<w:p[^>]*>/);
  
  const styleRe = /<w:pStyle\s+w:val="([^"]+)"/;
  for (const para of paragraphs) {
    // Check for paragraph style
    const styleMatch = styleRe.exec(para);
    if (!styleMatch?.[1]) continue;
    
    const styleName = styleMatch[1].toLowerCase();
    
    // Check if style matches any of our target styles
    const matchesTarget = styleNames.some(target => 
      styleName === target.toLowerCase() ||
      styleName.includes(target.toLowerCase())
    );
    
    if (!matchesTarget) continue;
    
    // Extract text from this paragraph
    const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (!textMatches) continue;
    
    const text = textMatches
      .map(m => m.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, "$1"))
      .join("");
    
    if (text.trim() && !isInvalidTitle(text)) {
      return cleanTitle(text);
    }
  }
  
  return null;
}

/**
 * Extract full text from DOCX for first-line fallback.
 */
async function extractDocxText(zip: JSZip): Promise<string> {
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  
  const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (!matches) return "";
  
  return matches
    .map(m => m.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, "$1"))
    .join(" ");
}

/**
 * Extract title from DOCX file.
 * Priority: Title style → Heading 1 → First line → null
 */
async function extractTitleFromDocx(file: File): Promise<string | null> {
  try {
    const zip = await JSZip.loadAsync(file);
    const xml = await zip.file("word/document.xml")?.async("string");
    
    if (!xml) return null;
    
    // 1. Look for Title-styled paragraph
    const titleStyled = findStyledParagraph(xml, ["Title"]);
    if (titleStyled) return titleStyled;
    
    // 2. Look for Heading 1 styled paragraph
    const heading1 = findStyledParagraph(xml, ["Heading1", "Heading 1"]);
    if (heading1) return heading1;
    
    // 3. Try first line of body text
    const fullText = await extractDocxText(zip);
    const firstLine = extractFirstLine(fullText);
    if (firstLine) return firstLine;
    
    return null;
  } catch (err) {
    console.error("[TitleExtract] DOCX extraction error:", err);
    return null;
  }
}

/**
 * Extract title from TXT file.
 * Uses first line under 80 characters.
 */
async function extractTitleFromTxt(file: File): Promise<string | null> {
  try {
    const text = await file.text();
    return extractFirstLine(text);
  } catch (err) {
    console.error("[TitleExtract] TXT extraction error:", err);
    return null;
  }
}

/**
 * Extract title from PDF file.
 * Client-side PDF parsing is limited; we primarily rely on filename fallback.
 * This function attempts basic text extraction but gracefully returns null on failure.
 */
async function extractTitleFromPdf(_file: File): Promise<string | null> {
  // PDF parsing in the browser is complex and unreliable
  // pdf-parse doesn't work client-side without significant setup
  // For scanned PDFs or complex documents, this would fail anyway
  // Return null to fall through to filename fallback
  return null;
}

/**
 * Main title extraction function.
 * Attempts to extract a title from the document content, falling back to filename.
 * 
 * @param file - The uploaded file
 * @returns Object with extracted title and source indicator
 */
export async function extractTitle(file: File): Promise<TitleExtractionResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  let documentTitle: string | null = null;
  
  try {
    switch (ext) {
      case "docx":
        documentTitle = await extractTitleFromDocx(file);
        break;
      case "txt":
        documentTitle = await extractTitleFromTxt(file);
        break;
      case "pdf":
        documentTitle = await extractTitleFromPdf(file);
        break;
      case "doc":
        // Legacy .doc format not supported client-side
        documentTitle = null;
        break;
      default:
        documentTitle = null;
    }
  } catch (err) {
    // Catch any unexpected errors and fall through to filename
    console.error("[TitleExtract] Unexpected error:", err);
    documentTitle = null;
  }
  
  // If we got a valid title from the document, use it
  if (documentTitle) {
    return {
      title: documentTitle,
      source: "document",
    };
  }
  
  // Fall back to filename
  return {
    title: fileNameToTitle(file.name),
    source: "filename",
  };
}
