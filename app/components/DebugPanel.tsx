import React from "react";

import { useVirtualKeyboard, VirtualKeyEvent } from "./VirtualKeyboard";

interface DebugPanelProps {
  data: Record<string, unknown> | null;
}

export const DebugPanel = ({ data }: DebugPanelProps) => {
  const { emit } = useVirtualKeyboard();

  const simulateKey = (key: string, modifiers: Partial<VirtualKeyEvent> = {}) => {
    emit({ key, ...modifiers });
  };

  return (
    <div className="debug-container">
      <pre>{data ? JSON.stringify(data, null, 2) : "No debug data yet"}</pre>
      <div className="debug-controls">
        <div className="debug-controls-row">
          <span className="debug-label">Cursor:</span>
          <button onClick={() => simulateKey("ArrowLeft")}>←</button>
          <button onClick={() => simulateKey("ArrowRight")}>→</button>
        </div>
        <div className="debug-controls-row">
          <span className="debug-label">Word:</span>
          <button onClick={() => simulateKey("ArrowLeft", { altKey: true })}>⌥←</button>
          <button onClick={() => simulateKey("ArrowRight", { altKey: true })}>⌥→</button>
        </div>
        <div className="debug-controls-row">
          <span className="debug-label">Sentence:</span>
          <button onClick={() => simulateKey("ArrowLeft", { metaKey: true })}>⌘←</button>
          <button onClick={() => simulateKey("ArrowRight", { metaKey: true })}>⌘→</button>
        </div>
        <div className="debug-controls-row">
          <span className="debug-label">Select Word:</span>
          <button onClick={() => simulateKey("ArrowLeft", { shiftKey: true, altKey: true })}>⇧⌥←</button>
          <button onClick={() => simulateKey("ArrowRight", { shiftKey: true, altKey: true })}>⇧⌥→</button>
        </div>
        <div className="debug-controls-row">
          <span className="debug-label">Select Sentence:</span>
          <button onClick={() => simulateKey("ArrowLeft", { shiftKey: true, metaKey: true })}>⇧⌘←</button>
          <button onClick={() => simulateKey("ArrowRight", { shiftKey: true, metaKey: true })}>⇧⌘→</button>
        </div>
        <div className="debug-controls-row">
          <span className="debug-label">Other:</span>
          <button onClick={() => simulateKey("Escape")}>Esc</button>
          <button onClick={() => simulateKey("Backspace")}>⌫</button>
        </div>
      </div>
    </div>
  );
};
