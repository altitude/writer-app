import React, { useEffect } from "react";
import { useDocument } from "./DocumentContext";
import { useVirtualKeyboard } from "./VirtualKeyboard";

interface PreviewViewProps {
  onClose: () => void;
}

export const PreviewView = ({ onClose }: PreviewViewProps) => {
  const { document } = useDocument();
  const { subscribe } = useVirtualKeyboard();

  // Get placed fragments in assembly order
  const placedFragments = document.assembly
    .map(id => document.fragments.find(f => f.id === id))
    .filter(f => f !== undefined);

  // Build the preview content - only committed sentences
  const previewContent = placedFragments.map((fragment, fragIdx) => {
    const committedSentences = fragment.sentences
      .filter(s => s.committed)
      .map(s => s.text);
    
    return {
      fragmentId: fragment.id,
      fragmentIndex: fragIdx,
      text: committedSentences.join(' '),
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
    };

    return subscribe(handleKeyDown);
  }, [subscribe, onClose]);

  const hasContent = previewContent.length > 0 && previewContent.some(f => f.text.length > 0);

  return (
    <div className="preview-view">
      <div className="preview-header">
        <span className="preview-title">Preview</span>
        <span className="preview-shortcuts">
          Esc close
        </span>
      </div>

      <div className="preview-content">
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

