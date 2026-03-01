"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type CommentForHighlight = {
  id: string;
  positionData?: {
    startOffset?: number;
    endOffset?: number;
    selectedText?: string;
  } | null;
};

type Selection = {
  text: string;
  startOffset: number;
  endOffset: number;
  rect: { top: number; left: number };
  highlightRects: { x: number; y: number; width: number; height: number }[];
};

type Props = {
  fileUrl: string;
  mimeType: string;
  title?: string | null;
  documentVersion?: number;
  comments?: CommentForHighlight[] | null;
  onSelectionChange?: (selection: Selection | null) => void;
  canComment?: boolean;
  pendingHighlight?: { 
    text: string; 
    startOffset: number; 
    endOffset: number;
    highlightRects?: { x: number; y: number; width: number; height: number }[];
  } | null;
  navigateToComment?: { text: string; id: string } | null;
  onNavigateComplete?: () => void;
  onCancelComment?: () => void;
  disableClickAway?: boolean;
};

const DocxViewer = React.memo(function DocxViewer({
  fileUrl,
  title,
  containerRef,
  onTextSelected,
  _documentVersion,
}: {
  fileUrl: string;
  title?: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTextSelected: (sel: Selection | null) => void;
  _documentVersion?: number;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error("Failed to fetch document");
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();

        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) {
          setHtml(result.value);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Track where mouseDown happened to detect clicks vs drags
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const downPos = mouseDownPosRef.current;
    mouseDownPosRef.current = null;
    
    // Check if this was a click (not a drag) - if so, clear selection
    const isClick = downPos && 
      Math.abs(e.clientX - downPos.x) < 5 && 
      Math.abs(e.clientY - downPos.y) < 5;
    
    const sel = window.getSelection();
    
    if (isClick) {
      // User clicked without dragging - clear selection
      onTextSelected(null);
      return;
    }
    
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      onTextSelected(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text) {
      onTextSelected(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    
    const clientRects = Array.from(range.getClientRects());
    const highlightRects = clientRects.map(r => ({
      x: r.left - containerRect.left,
      y: r.top - containerRect.top + container.scrollTop,
      width: r.width,
      height: r.height,
    }));

    onTextSelected({
      text,
      startOffset: 0,
      endOffset: text.length,
      rect: {
        top: rect.top - containerRect.top + container.scrollTop,
        left: rect.left - containerRect.left,
      },
      highlightRects,
    });
  }, [containerRef, onTextSelected]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-white">
        <p className="text-muted-foreground">Loading document…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-white">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="docx-viewer--continuous relative bg-white rounded-lg border border-border"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div className="p-[1in]">
        {title && (
          <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">
            {title}
          </h1>
        )}
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html ?? "" }}
        />
      </div>
    </div>
  );
});

const PdfViewer = React.memo(function PdfViewer({
  fileUrl,
  title,
  containerRef,
  onTextSelected,
}: {
  fileUrl: string;
  title?: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTextSelected: (sel: Selection | null) => void;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const downPos = mouseDownPosRef.current;
    mouseDownPosRef.current = null;
    
    const isClick = downPos && 
      Math.abs(e.clientX - downPos.x) < 5 && 
      Math.abs(e.clientY - downPos.y) < 5;
    
    const sel = window.getSelection();
    
    if (isClick) {
      onTextSelected(null);
      return;
    }
    
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      onTextSelected(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      onTextSelected(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    
    const clientRects = Array.from(range.getClientRects());
    const highlightRects = clientRects.map(r => ({
      x: r.left - containerRect.left,
      y: r.top - containerRect.top + container.scrollTop,
      width: r.width,
      height: r.height,
    }));

    onTextSelected({
      text,
      startOffset: 0,
      endOffset: text.length,
      rect: {
        top: rect.top - containerRect.top + container.scrollTop,
        left: rect.left - containerRect.left,
      },
      highlightRects,
    });
  }, [containerRef, onTextSelected]);

  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-lg border border-border"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div className="p-[1in]">
        {title && (
          <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">
            {title}
          </h1>
        )}
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">Loading PDF…</p>
            </div>
          }
          error={
            <div className="flex h-64 items-center justify-center">
              <p className="text-destructive">Failed to load PDF</p>
            </div>
          }
        >
          {numPages &&
            Array.from({ length: numPages }, (_, i) => (
              <Page
                key={i + 1}
                pageNumber={i + 1}
                width={612}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            ))}
        </Document>
      </div>
    </div>
  );
});

const TextViewer = React.memo(function TextViewer({
  fileUrl,
  title,
  containerRef,
  onTextSelected,
  _documentVersion,
}: {
  fileUrl: string;
  title?: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTextSelected: (sel: Selection | null) => void;
  _documentVersion?: number;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error("Failed to fetch");
        const text = await res.text();
        if (!cancelled) {
          setContent(text);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const downPos = mouseDownPosRef.current;
    mouseDownPosRef.current = null;
    
    const isClick = downPos && 
      Math.abs(e.clientX - downPos.x) < 5 && 
      Math.abs(e.clientY - downPos.y) < 5;
    
    const sel = window.getSelection();
    
    if (isClick) {
      onTextSelected(null);
      return;
    }
    
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      onTextSelected(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      onTextSelected(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    
    const clientRects = Array.from(range.getClientRects());
    const highlightRects = clientRects.map(r => ({
      x: r.left - containerRect.left,
      y: r.top - containerRect.top + container.scrollTop,
      width: r.width,
      height: r.height,
    }));

    onTextSelected({
      text,
      startOffset: 0,
      endOffset: text.length,
      rect: {
        top: rect.top - containerRect.top + container.scrollTop,
        left: rect.left - containerRect.left,
      },
      highlightRects,
    });
  }, [containerRef, onTextSelected]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-white">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-white">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-lg border border-border"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div className="p-[1in]">
        {title && (
          <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">
            {title}
          </h1>
        )}
        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
          {content}
        </pre>
      </div>
    </div>
  );
});

export function DocumentViewer({
  fileUrl,
  mimeType,
  title,
  documentVersion,
  comments: _comments,
  onSelectionChange,
  canComment = true,
  pendingHighlight,
  onCancelComment,
  navigateToComment,
  onNavigateComplete,
  disableClickAway = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  
  // Use refs to keep callbacks stable and prevent viewer re-renders
  const pendingHighlightRef = useRef(pendingHighlight);
  const onCancelCommentRef = useRef(onCancelComment);
  pendingHighlightRef.current = pendingHighlight;
  onCancelCommentRef.current = onCancelComment;

  const handleTextSelected = useCallback(
    (sel: Selection | null) => {
      // Save the browser selection range
      if (sel) {
        const browserSel = window.getSelection();
        if (browserSel && browserSel.rangeCount > 0) {
          savedRangeRef.current = browserSel.getRangeAt(0).cloneRange();
        }
      } else {
        savedRangeRef.current = null;
      }
      
      setSelection(sel);
      if (sel === null && pendingHighlightRef.current && onCancelCommentRef.current) {
        onCancelCommentRef.current();
      }
    },
    [] // No dependencies - callback is stable
  );

  // Track selection in a ref for the click-away handler
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  // Function to clear selection
  const clearSelectionAndComment = useCallback(() => {
    setSelection(null);
    savedRangeRef.current = null;
    window.getSelection()?.removeAllRanges();
    if (pendingHighlightRef.current) {
      onCancelCommentRef.current?.();
    }
  }, []);

  // Track disableClickAway in a ref
  const disableClickAwayRef = useRef(disableClickAway);
  disableClickAwayRef.current = disableClickAway;

  // Global click handler to clear selection when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Don't clear if click-away is disabled (user has started typing)
      if (disableClickAwayRef.current) return;
      
      // Check if we have anything to clear
      if (!selectionRef.current && !pendingHighlightRef.current) return;
      
      const target = e.target as HTMLElement;
      
      // Don't clear if clicking inside the document viewer
      if (target.closest('[data-document-viewer]')) return;
      // Don't clear if clicking inside the comments panel
      if (target.closest('[data-comments-panel]')) return;
      
      // Clear everything
      clearSelectionAndComment();
    };
    
    // Use click event in capture phase
    window.addEventListener('click', handleGlobalClick, true);
    
    return () => {
      window.removeEventListener('click', handleGlobalClick, true);
    };
  }, [clearSelectionAndComment]);

  // Clear saved range and browser selection when pendingHighlight is cleared
  useEffect(() => {
    if (!pendingHighlight) {
      savedRangeRef.current = null;
      window.getSelection()?.removeAllRanges();
    }
  }, [pendingHighlight]);

  // Store multiple mark elements for multi-node selections
  const markElementsRef = useRef<HTMLElement[]>([]);
  
  const clearAllMarks = useCallback(() => {
    markElementsRef.current.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
      }
    });
    markElementsRef.current = [];
    // Normalize text nodes after removing marks
    containerRef.current?.normalize();
  }, []);
  
  const applyHighlightFromSelection = useCallback(() => {
    const browserSel = window.getSelection();
    if (!browserSel || browserSel.rangeCount === 0) return;
    
    const range = browserSel.getRangeAt(0);
    savedRangeRef.current = range.cloneRange();
    
    // Clear any existing marks
    clearAllMarks();
    
    // Get all text nodes within the range
    const container = range.commonAncestorContainer;
    const root = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    if (!root) return;
    
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (range.intersectsNode(node)) {
        textNodes.push(node as Text);
      }
    }
    
    // Wrap each text node (or portion of it) in a mark
    textNodes.forEach(textNode => {
      let startOffset = 0;
      let endOffset = textNode.length;
      
      // Adjust offsets for start/end containers
      if (textNode === range.startContainer) {
        startOffset = range.startOffset;
      }
      if (textNode === range.endContainer) {
        endOffset = range.endOffset;
      }
      
      if (startOffset >= endOffset) return;
      
      // Split text node and wrap the selected portion
      const beforeText = textNode.textContent?.slice(0, startOffset) ?? '';
      const selectedText = textNode.textContent?.slice(startOffset, endOffset) ?? '';
      const afterText = textNode.textContent?.slice(endOffset) ?? '';
      
      const parent = textNode.parentNode;
      if (!parent) return;
      
      const mark = document.createElement('mark');
      mark.style.backgroundColor = 'rgb(191 219 254 / 0.7)';
      mark.dataset.pendingHighlight = 'true';
      mark.textContent = selectedText;
      
      // Replace original text node with: before + mark + after
      if (beforeText) {
        parent.insertBefore(document.createTextNode(beforeText), textNode);
      }
      parent.insertBefore(mark, textNode);
      if (afterText) {
        parent.insertBefore(document.createTextNode(afterText), textNode);
      }
      parent.removeChild(textNode);
      
      markElementsRef.current.push(mark);
    });
    
    // Clear native selection since we have marks
    browserSel.removeAllRanges();
  }, [clearAllMarks]);

  // Clean up mark elements when pendingHighlight is cleared (save or cancel)
  useEffect(() => {
    if (pendingHighlight) return;
    clearAllMarks();
    savedRangeRef.current = null;
  }, [pendingHighlight, clearAllMarks]);

  // Navigate to comment text when clicked
  useEffect(() => {
    if (!navigateToComment) return;

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const container = containerRef.current;
      
      if (!container) {
        onNavigateComplete?.();
        return;
      }

      const originalText = navigateToComment.text;
      // Get the first word for locating the start position
      const firstWord = originalText
        .replace(/[•\-\*\[\](){}]/g, ' ')
        .split(/\s+/)
        .find(w => w.length > 0 && /[a-zA-Z0-9]/.test(w)) ?? '';
      
      // Calculate how many characters we need to select (normalize whitespace for comparison)
      const normalizedOriginal = originalText.replace(/\s+/g, ' ').trim();
      const targetLength = normalizedOriginal.length;
      
      console.log('[Navigation] Looking for:', firstWord, '| Full text length:', targetLength);

      if (!firstWord) {
        console.log('[Navigation] No valid search word found');
        onNavigateComplete?.();
        return;
      }

      // Collect all text nodes with their positions
      const treeWalker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );

      const textNodes: { node: Text; start: number; end: number }[] = [];
      let totalLength = 0;
      let node: Text | null;
      
      while ((node = treeWalker.nextNode() as Text | null)) {
        const len = node.textContent?.length ?? 0;
        textNodes.push({ node, start: totalLength, end: totalLength + len });
        totalLength += len;
      }

      // Build combined text for searching
      const combinedText = textNodes.map(tn => tn.node.textContent ?? '').join('');
      
      // Find the first word (case-insensitive)
      const lowerCombined = combinedText.toLowerCase();
      const lowerFirstWord = firstWord.toLowerCase();
      const startIndex = lowerCombined.indexOf(lowerFirstWord);
      
      if (startIndex === -1) {
        console.log('[Navigation] First word not found:', firstWord);
        onNavigateComplete?.();
        return;
      }

      // Find actual end by matching as much of the original text as possible
      let actualEndIndex = startIndex;
      let originalIdx = 0;
      let domIdx = startIndex;
      
      while (originalIdx < normalizedOriginal.length && domIdx < combinedText.length) {
        const origChar = normalizedOriginal[originalIdx];
        const domChar = combinedText[domIdx];
        
        // Skip whitespace in both strings (they may not match exactly)
        if (/\s/.test(origChar ?? '')) {
          originalIdx++;
          continue;
        }
        if (/\s/.test(domChar ?? '')) {
          domIdx++;
          continue;
        }
        
        // Characters should match (case-insensitive for robustness)
        if (origChar?.toLowerCase() === domChar?.toLowerCase()) {
          actualEndIndex = domIdx + 1;
          originalIdx++;
          domIdx++;
        } else {
          // Mismatch - stop here
          break;
        }
      }
      
      console.log('[Navigation] Selecting from', startIndex, 'to', actualEndIndex, '(', actualEndIndex - startIndex, 'chars)');

      // Find the start node and offset
      let startNode: Text | null = null;
      let startOffset = 0;
      let endNode: Text | null = null;
      let endOffset = 0;
      
      for (const tn of textNodes) {
        if (!startNode && startIndex >= tn.start && startIndex < tn.end) {
          startNode = tn.node;
          startOffset = startIndex - tn.start;
        }
        if (actualEndIndex > tn.start && actualEndIndex <= tn.end) {
          endNode = tn.node;
          endOffset = actualEndIndex - tn.start;
        }
      }
      
      // Handle case where end is at the very end of a node
      if (!endNode && textNodes.length > 0) {
        const lastNode = textNodes[textNodes.length - 1]!;
        if (actualEndIndex >= lastNode.end) {
          endNode = lastNode.node;
          endOffset = lastNode.node.textContent?.length ?? 0;
        }
      }

      if (startNode && endNode) {
        try {
          const range = document.createRange();
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);

          // Use native browser selection for highlighting
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);

          // Scroll the range into view
          const rect = range.getBoundingClientRect();
          window.scrollTo({
            top: rect.top + window.scrollY - 200,
            behavior: 'smooth'
          });

          console.log('[Navigation] Highlighted full selection');

          // Clear selection when user clicks anywhere
          const clearOnClick = () => {
            window.getSelection()?.removeAllRanges();
            onNavigateComplete?.();
            document.removeEventListener('mousedown', clearOnClick);
          };
          
          setTimeout(() => {
            document.addEventListener('mousedown', clearOnClick);
          }, 100);
        } catch (e) {
          console.log('[Navigation] Error creating range:', e);
          onNavigateComplete?.();
        }
      } else {
        console.log('[Navigation] Could not find start/end nodes');
        onNavigateComplete?.();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [navigateToComment, onNavigateComplete]);

  useEffect(() => {
    if (!pendingHighlight || !onCancelComment) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancelComment();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pendingHighlight, onCancelComment]);

  const isDocx =
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword";
  const isPdf = mimeType === "application/pdf";
  const isText = mimeType === "text/plain";

  const showCommentButton = canComment && selection?.rect;

  return (
    <div className="relative" data-document-viewer>
      {isDocx && (
        <div className="relative">
          <DocxViewer
            fileUrl={fileUrl}
            title={title}
            containerRef={containerRef}
            onTextSelected={handleTextSelected}
            _documentVersion={documentVersion}
          />
          {showCommentButton && (
            <div
              className="absolute z-20"
              style={{
                top: selection.rect.top - 48,
                left: selection.rect.left,
              }}
            >
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  applyHighlightFromSelection();
                  onSelectionChange?.(selection);
                  setSelection(null);
                }}
              >
                Comment
              </button>
              {/* Tail pointing down */}
              <div
                className="absolute left-4 border-x-8 border-t-8 border-x-transparent border-t-border"
                style={{ top: '100%' }}
              />
              <div
                className="absolute left-4 border-x-8 border-t-8 border-x-transparent border-t-background"
                style={{ top: 'calc(100% - 1px)' }}
              />
            </div>
          )}
        </div>
      )}
      {isPdf && (
        <div className="relative">
          <PdfViewer
            fileUrl={fileUrl}
            title={title}
            containerRef={containerRef}
            onTextSelected={handleTextSelected}
          />
          {showCommentButton && (
            <div
              className="absolute z-20"
              style={{
                top: selection.rect.top - 48,
                left: selection.rect.left,
              }}
            >
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  applyHighlightFromSelection();
                  onSelectionChange?.(selection);
                  setSelection(null);
                }}
              >
                Comment
              </button>
              {/* Tail pointing down */}
              <div
                className="absolute left-4 border-x-8 border-t-8 border-x-transparent border-t-border"
                style={{ top: '100%' }}
              />
              <div
                className="absolute left-4 border-x-8 border-t-8 border-x-transparent border-t-background"
                style={{ top: 'calc(100% - 1px)' }}
              />
            </div>
          )}
        </div>
      )}
      {isText && (
        <div className="relative">
          <TextViewer
            fileUrl={fileUrl}
            title={title}
            containerRef={containerRef}
            onTextSelected={handleTextSelected}
            _documentVersion={documentVersion}
          />
          {showCommentButton && (
            <div
              className="absolute z-20"
              style={{
                top: selection.rect.top - 48,
                left: selection.rect.left,
              }}
            >
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  applyHighlightFromSelection();
                  onSelectionChange?.(selection);
                  setSelection(null);
                }}
              >
                Comment
              </button>
              {/* Tail pointing down */}
              <div
                className="absolute left-4 border-x-8 border-t-8 border-x-transparent border-t-border"
                style={{ top: '100%' }}
              />
              <div
                className="absolute left-4 border-x-8 border-t-8 border-x-transparent border-t-background"
                style={{ top: 'calc(100% - 1px)' }}
              />
            </div>
          )}
        </div>
      )}
      {!isDocx && !isPdf && !isText && (
        <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-white">
          <p className="text-muted-foreground">Unsupported file format</p>
        </div>
      )}
    </div>
  );
}
