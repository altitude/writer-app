import React, { useEffect, useState, useMemo } from "react";
import { useDocument } from "./DocumentContext";
import { useLibrary } from "./LibraryContext";
import { useVirtualKeyboard } from "./VirtualKeyboard";

interface ExportViewProps {
  onClose: () => void;
}

export const ExportView = ({ onClose }: ExportViewProps) => {
  const { document } = useDocument();
  const { currentDocument } = useLibrary();
  const { subscribe } = useVirtualKeyboard();
  const [copied, setCopied] = useState(false);

  // Get placed fragments in assembly order
  const placedFragments = document.assembly
    .map(id => document.fragments.find(f => f.id === id))
    .filter(f => f !== undefined);

  // Build the export content - only committed sentences with proper separators
  const exportContent = useMemo(() => {
    const paragraphs = placedFragments.map(fragment => {
      // Filter to only committed sentences
      const committedWithIndex = fragment.sentences
        .map((s, i) => ({ ...s, originalIndex: i }))
        .filter(s => s.committed);
      
      // Join with proper separators
      const text = committedWithIndex.map((s, i) => {
        const isLast = i === committedWithIndex.length - 1;
        if (isLast) return s.text;
        return s.text + (s.separator ?? ' ');
      }).join('');
      
      return text;
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

