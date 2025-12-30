import React, { useEffect } from "react";
import { useVirtualKeyboard } from "./VirtualKeyboard";

interface HelpViewProps {
  onClose: () => void;
}

export const HelpView = ({ onClose }: HelpViewProps) => {
  const { subscribe } = useVirtualKeyboard();

  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean; shiftKey?: boolean }) => {
      // Any key closes help
      if (event.key === "Escape" || (event.metaKey && event.shiftKey && event.key === "?") || event.key === "Enter") {
        onClose();
      }
    };

    return subscribe(handleKeyDown);
  }, [subscribe, onClose]);

  return (
    <div className="help-view">
      <div className="help-header">
        <span className="help-title">Keyboard Shortcuts</span>
        <span className="help-shortcuts">Press any key to close</span>
      </div>

      <div className="help-content">
        <div className="help-section">
          <div className="help-section-title">Navigation</div>
          <div className="help-row"><span className="help-key">⌘L</span> Library</div>
          <div className="help-row"><span className="help-key">⌘J</span> Previous fragment</div>
          <div className="help-row"><span className="help-key">⌘K</span> Next fragment</div>
          <div className="help-row"><span className="help-key">^N</span> New fragment</div>
          <div className="help-row"><span className="help-key">⌘A</span> Assembly view</div>
          <div className="help-row"><span className="help-key">⌘P</span> Preview</div>
          <div className="help-row"><span className="help-key">⌘E</span> Export</div>
        </div>

        <div className="help-section">
          <div className="help-section-title">Editor</div>
          <div className="help-row"><span className="help-key">⌘↵</span> Commit/uncommit sentence</div>
          <div className="help-row"><span className="help-key">⌥←→</span> Select word</div>
          <div className="help-row"><span className="help-key">⌥⇧←→</span> Extend word selection</div>
          <div className="help-row"><span className="help-key">^A / ^E</span> Line start / end</div>
          <div className="help-row"><span className="help-key">⌘D</span> Dictionary</div>
          <div className="help-row"><span className="help-key">⌘Z</span> Undo</div>
          <div className="help-row"><span className="help-key">⇧⌘Z</span> Redo</div>
        </div>

        <div className="help-section">
          <div className="help-section-title">Assembly</div>
          <div className="help-row"><span className="help-key">↑↓</span> Navigate</div>
          <div className="help-row"><span className="help-key">⌘↑↓</span> Reorder</div>
          <div className="help-row"><span className="help-key">⇥</span> Place/unplace</div>
          <div className="help-row"><span className="help-key">N</span> New fragment</div>
          <div className="help-row"><span className="help-key">P</span> Preview</div>
          <div className="help-row"><span className="help-key">⌫</span> Delete (empty only)</div>
        </div>

        <div className="help-section">
          <div className="help-section-title">Library</div>
          <div className="help-row"><span className="help-key">↑↓</span> Navigate</div>
          <div className="help-row"><span className="help-key">R</span> Rename document</div>
          <div className="help-row"><span className="help-key">N</span> New document</div>
          <div className="help-row"><span className="help-key">⌫</span> Delete (empty only)</div>
          <div className="help-row"><span className="help-key">↵</span> Open</div>
        </div>
      </div>
    </div>
  );
};

