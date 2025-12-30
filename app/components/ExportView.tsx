import React, { useEffect, useState, useMemo } from "react";
import { useDocument } from "./DocumentContext";
import { useLibrary } from "./LibraryContext";
import { useVirtualKeyboard } from "./VirtualKeyboard";
import { GhostRange, Fragment } from "./types";

interface ExportViewProps {
  onClose: () => void;
}

// Get committed text from a fragment, excluding ghosted ranges
const getCommittedTextWithoutGhosts = (fragment: Fragment): string => {
  const ghostRanges = fragment.ghostRanges || [];
  const parts: string[] = [];
  let charPos = 0;
  
  for (let i = 0; i < fragment.sentences.length; i++) {
    const sentence = fragment.sentences[i];
    const isLast = i === fragment.sentences.length - 1;
    const sentenceLength = sentence.text.length;
    const sentenceStart = charPos;
    
    if (sentence.committed) {
      // Get the portion of this sentence that isn't ghosted
      let sentenceText = sentence.text;
      
      // Find ghost ranges that overlap with this sentence and remove them
      for (const ghost of [...ghostRanges].sort((a, b) => b.start - a.start)) {
        const overlapStart = Math.max(ghost.start - sentenceStart, 0);
        const overlapEnd = Math.min(ghost.end - sentenceStart, sentenceLength);
        
        if (overlapStart < sentenceLength && overlapEnd > 0 && overlapStart < overlapEnd) {
          sentenceText = sentenceText.slice(0, overlapStart) + sentenceText.slice(overlapEnd);
        }
      }
      
      if (sentenceText.length > 0) {
        parts.push(sentenceText);
        // Add separator if not last
        if (!isLast && sentence.separator) {
          parts.push(sentence.separator);
        } else if (!isLast) {
          parts.push(' ');
        }
      }
    }
    
    charPos += sentenceLength + (isLast ? 0 : (sentence.separator ?? ' ').length);
  }
  
  return parts.join('').trim();
};

export const ExportView = ({ onClose }: ExportViewProps) => {
  const { document } = useDocument();
  const { currentDocument } = useLibrary();
  const { subscribe } = useVirtualKeyboard();
  const [copied, setCopied] = useState(false);

  // Get placed fragments in assembly order
  const placedFragments = document.assembly
    .map(id => document.fragments.find(f => f.id === id))
    .filter(f => f !== undefined);

  // Build the export content - only committed sentences with proper separators, excluding ghost text
  const exportContent = useMemo(() => {
    const paragraphs = placedFragments.map(fragment => {
      return getCommittedTextWithoutGhosts(fragment);
    }).filter(text => text.length > 0);

    return paragraphs.join('\n\n');
  }, [placedFragments]);

  // Calculate stats
  const stats = useMemo(() => {
    const words = exportContent.split(/\s+/).filter(w => w.length > 0);
    const sentences = exportContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      charCount: exportContent.length,
    };
  }, [exportContent]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean }) => {
      // Escape or Cmd+E to close
      if (event.key === "Escape" || (event.metaKey && event.key.toLowerCase() === "e")) {
        onClose();
        return;
      }

      // Enter to copy
      if (event.key === "Enter") {
        handleCopy();
        return;
      }
    };

    return subscribe(handleKeyDown);
  }, [subscribe, onClose]);

  const handleCopy = async () => {
    if (exportContent.length === 0) return;
    
    try {
      await navigator.clipboard.writeText(exportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const hasContent = exportContent.length > 0;
  const documentTitle = currentDocument?.title || 'Untitled';

  return (
    <div className="export-view">
      <div className="export-header">
        <span className="export-title">Export</span>
        <span className="export-shortcuts">
          ↵ copy · Esc close
        </span>
      </div>

      <div className="export-content">
        <div className="export-document-info">
          <div className="export-document-title">"{documentTitle}"</div>
          {hasContent ? (
            <div className="export-stats">
              {stats.wordCount.toLocaleString()} words · {stats.sentenceCount} sentences
            </div>
          ) : (
            <div className="export-stats empty">No committed content</div>
          )}
        </div>

        <div className="export-divider" />

        <div className="export-actions">
          <button 
            className={`export-button ${!hasContent ? 'disabled' : ''}`}
            onClick={handleCopy}
            disabled={!hasContent}
          >
            Copy to Clipboard
          </button>
          {copied && (
            <span className="export-copied">✓ Copied!</span>
          )}
        </div>

        <div className="export-hint">
          {hasContent 
            ? "Exports assembled, committed content"
            : "Commit sentences with ⌘↵ in the editor"
          }
        </div>

        {hasContent && (
          <div className="export-preview">
            <div className="export-preview-label">Preview</div>
            <div className="export-preview-text">
              {exportContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

