import React, { useEffect, useRef } from "react";
import { useDocument } from "./DocumentContext";
import { useVirtualKeyboard } from "./VirtualKeyboard";
import { GhostRange } from "./types";

interface PreviewViewProps {
  onClose: () => void;
}

const SCROLL_AMOUNT = 60; // pixels per arrow press

// Remove ghosted ranges from text
const removeGhostedText = (text: string, ghostRanges: GhostRange[]): string => {
  if (!ghostRanges || ghostRanges.length === 0) return text;
  
  // Sort ranges by start position, descending, so we can remove from end to start
  const sortedRanges = [...ghostRanges].sort((a, b) => b.start - a.start);
  
  let result = text;
  for (const range of sortedRanges) {
    // Only remove if range is within text bounds
    if (range.start >= 0 && range.end <= result.length && range.start < range.end) {
      result = result.slice(0, range.start) + result.slice(range.end);
    }
  }
  return result;
};

export const PreviewView = ({ onClose }: PreviewViewProps) => {
  const { document } = useDocument();
  const { subscribe } = useVirtualKeyboard();
  const contentRef = useRef<HTMLDivElement>(null);

  // Get placed fragments in assembly order
  const placedFragments = document.assembly
    .map(id => document.fragments.find(f => f.id === id))
    .filter(f => f !== undefined);

  // Build the preview content - only committed sentences with proper separators, excluding ghost text
  const previewContent = placedFragments.map((fragment, fragIdx) => {
    // First, build the full text (like Editor does) to have correct char positions for ghost ranges
    const fullText = fragment.sentences.map((s, i) => {
      const isLast = i === fragment.sentences.length - 1;
      return s.text + (isLast ? '' : (s.separator ?? ' '));
    }).join('');
    
    // Remove ghosted text from the full text
    const textWithoutGhosts = removeGhostedText(fullText, fragment.ghostRanges || []);
    
    // Now we need to extract only committed sentences from this cleaned text
    // We'll track character positions as we go
    let charPos = 0;
    const committedParts: string[] = [];
    
    for (let i = 0; i < fragment.sentences.length; i++) {
      const sentence = fragment.sentences[i];
      const isLast = i === fragment.sentences.length - 1;
      const sentenceLength = sentence.text.length;
      const separatorLength = isLast ? 0 : (sentence.separator ?? ' ').length;
      
      // Check how much of this sentence overlaps with ghost ranges
      const sentenceStart = charPos;
      const sentenceEnd = charPos + sentenceLength;
      
      if (sentence.committed) {
        // Get the portion of this sentence that isn't ghosted
        let sentenceText = sentence.text;
        const ghostRanges = fragment.ghostRanges || [];
        
        // Find ghost ranges that overlap with this sentence
        for (const ghost of [...ghostRanges].sort((a, b) => b.start - a.start)) {
          const overlapStart = Math.max(ghost.start - sentenceStart, 0);
          const overlapEnd = Math.min(ghost.end - sentenceStart, sentenceLength);
          
          if (overlapStart < sentenceLength && overlapEnd > 0 && overlapStart < overlapEnd) {
            sentenceText = sentenceText.slice(0, overlapStart) + sentenceText.slice(overlapEnd);
          }
        }
        
        if (sentenceText.length > 0) {
          committedParts.push(sentenceText);
          // Add separator if not last committed part
          if (!isLast && sentence.separator) {
            committedParts.push(sentence.separator);
          } else if (!isLast) {
            committedParts.push(' ');
          }
        }
      }
      
      charPos += sentenceLength + separatorLength;
    }
    
    const text = committedParts.join('').trim();
    
    return {
      fragmentId: fragment.id,
      fragmentIndex: fragIdx,
      text,
    };
  }).filter(f => f.text.length > 0);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean }) => {
      // Escape or Cmd+P to close
      if (event.key === "Escape" || (event.metaKey && event.key.toLowerCase() === "p")) {
        onClose();
        return;
      }

      // Arrow key scrolling
      if (event.key === "ArrowUp" && contentRef.current) {
        contentRef.current.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' });
        return;
      }
      if (event.key === "ArrowDown" && contentRef.current) {
        contentRef.current.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' });
        return;
      }
    };

    return subscribe(handleKeyDown);
  }, [subscribe, onClose]);

  const hasContent = previewContent.length > 0 && previewContent.some(f => f.text.length > 0);

  return (
    <div className="preview-view">
      <div className="preview-header">
        <span className="preview-title">Preview</span>
        <span className="preview-shortcuts">
          ↑↓ scroll · Esc close
        </span>
      </div>

      <div className="preview-content" ref={contentRef}>
        {!hasContent ? (
          <div className="preview-empty">
            No committed content yet.
            <br />
            <span className="preview-hint">Commit sentences with ⌘↵ in the editor.</span>
          </div>
        ) : (
          <div className="preview-text">
            {previewContent.map((fragment, idx) => (
              <p key={fragment.fragmentId} className="preview-paragraph">
                {fragment.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

