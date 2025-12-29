import React from "react";

import { useVirtualKeyboard, VirtualKeyEvent } from "./VirtualKeyboard";

interface TokenInfo {
  type: 'word' | 'separator';
  text: string;
  range: [number, number];
}

interface SentenceInfo {
  index: number;
  text: string;
  range: [number, number];
  tokens: TokenInfo[];
}

interface ASTInfo {
  sentences: SentenceInfo[];
  wordCount: number;
  sentenceCount: number;
}

interface DebugData {
  source: string;
  cursorPosition: number;
  wordSelection: { start: number; end: number; direction: string } | null;
  sentenceSelection: { start: number; end: number; direction: string } | null;
  ast: ASTInfo;
}

interface DebugPanelProps {
  data: DebugData | null;
}

const ASTView = ({ ast, cursorPosition }: { ast: ASTInfo; cursorPosition: number }) => {
  return (
    <div className="ast-view">
      <div className="ast-header">
        AST: {ast.sentenceCount} sentence{ast.sentenceCount !== 1 ? 's' : ''}, {ast.wordCount} word{ast.wordCount !== 1 ? 's' : ''}
      </div>
      <div className="ast-sentences">
        {ast.sentences.map((sentence) => (
          <div key={sentence.index} className="ast-sentence">
            <div className="ast-sentence-header">
              <span className="ast-sentence-index">S{sentence.index}</span>
              <span className="ast-range">[{sentence.range[0]}:{sentence.range[1]}]</span>
            </div>
            <div className="ast-tokens">
              {sentence.tokens.map((token, i) => {
                const isAtCursor = cursorPosition >= token.range[0] && cursorPosition < token.range[1];
                return (
                  <span
                    key={i}
                    className={`ast-token ast-token-${token.type}${isAtCursor ? ' ast-token-cursor' : ''}`}
                    title={`${token.type} [${token.range[0]}:${token.range[1]}]`}
                  >
                    {token.text.replace(/\n/g, '↵').replace(/ /g, '·')}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DebugPanel = ({ data }: DebugPanelProps) => {
  const { emit } = useVirtualKeyboard();

  const simulateKey = (key: string, modifiers: Partial<VirtualKeyEvent> = {}) => {
    emit({ key, ...modifiers });
  };

  const stateInfo = data ? {
    cursor: data.cursorPosition,
    wordSel: data.wordSelection ? `[${data.wordSelection.start}→${data.wordSelection.end}] ${data.wordSelection.direction}` : null,
    sentenceSel: data.sentenceSelection ? `[${data.sentenceSelection.start}→${data.sentenceSelection.end}] ${data.sentenceSelection.direction}` : null,
  } : null;

  return (
    <div className="debug-container">
      <div className="debug-state">
        <div className="debug-state-header">State</div>
        {stateInfo && (
          <div className="debug-state-items">
            <div><span className="debug-state-label">cursor:</span> {stateInfo.cursor}</div>
            <div><span className="debug-state-label">wordSel:</span> {stateInfo.wordSel ?? '—'}</div>
            <div><span className="debug-state-label">sentenceSel:</span> {stateInfo.sentenceSel ?? '—'}</div>
          </div>
        )}
      </div>
      
      {data?.ast && <ASTView ast={data.ast} cursorPosition={data.cursorPosition} />}
      
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
