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
  committed: boolean;
  tokens: TokenInfo[];
}

interface ASTInfo {
  sentences: SentenceInfo[];
  wordCount: number;
  sentenceCount: number;
  committedCount: number;
}

interface GhostRange {
  start: number;
  end: number;
}

interface DebugData {
  source: string;
  cursorPosition: number;
  wordSelection: { start: number; end: number; direction: string } | null;
  sentenceSelection: { start: number; end: number; direction: string } | null;
  ghostRanges: GhostRange[];
  ast: ASTInfo;
}

interface DebugPanelProps {
  data: DebugData | null;
}

const ASTView = ({ ast, cursorPosition, ghostRanges }: { 
  ast: ASTInfo; 
  cursorPosition: number;
  ghostRanges: GhostRange[];
}) => {
  // Check if a token overlaps with any ghost range
  const isGhostToken = (tokenRange: [number, number]) =>
    ghostRanges.some(g => g.start < tokenRange[1] && g.end > tokenRange[0]);

  return (
    <div className="ast-view">
      <div className="ast-header">
        AST: {ast.sentenceCount} sentence{ast.sentenceCount !== 1 ? 's' : ''}, {ast.wordCount} word{ast.wordCount !== 1 ? 's' : ''} ({ast.committedCount} committed)
      </div>
      <div className="ast-sentences">
        {ast.sentences.map((sentence) => (
          <div key={sentence.index} className={`ast-sentence ${sentence.committed ? 'ast-sentence-committed' : 'ast-sentence-uncommitted'}`}>
            <div className="ast-sentence-header">
              <span className="ast-sentence-index">{sentence.committed ? '✓' : '○'} S{sentence.index}</span>
              <span className="ast-range">[{sentence.range[0]}:{sentence.range[1]}]</span>
            </div>
            <div className="ast-tokens">
              {sentence.tokens.map((token, i) => {
                const isAtCursor = cursorPosition >= token.range[0] && cursorPosition < token.range[1];
                const isGhost = isGhostToken(token.range);
                const isUncommitted = !sentence.committed;
                return (
                  <span
                    key={i}
                    className={`ast-token ast-token-${token.type}${isAtCursor ? ' ast-token-cursor' : ''}${isGhost ? ' ast-token-ghost' : ''}${isUncommitted && !isGhost ? ' ast-token-uncommitted' : ''}`}
                    title={`${token.type} [${token.range[0]}:${token.range[1]}]${isGhost ? ' (ghost)' : ''}${isUncommitted ? ' (uncommitted)' : ''}`}
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
    ghostRanges: data.ghostRanges?.length > 0 
      ? data.ghostRanges.map(r => `[${r.start}:${r.end}]`).join(', ')
      : null,
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
            {stateInfo.ghostRanges && (
              <div><span className="debug-state-label">ghost:</span> {stateInfo.ghostRanges}</div>
            )}
          </div>
        )}
      </div>
      
      {data?.ast && <ASTView ast={data.ast} cursorPosition={data.cursorPosition} ghostRanges={data.ghostRanges ?? []} />}
      
      <div className="debug-controls">
        <div className="debug-controls-row">
          <span className="debug-label">Cursor:</span>
          <button onClick={() => simulateKey("ArrowLeft")}>←</button>
          <button onClick={() => simulateKey("ArrowRight")}>→</button>
          <button onClick={() => simulateKey("ArrowUp")}>↑</button>
          <button onClick={() => simulateKey("ArrowDown")}>↓</button>
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
          <span className="debug-label">Commit:</span>
          <button onClick={() => simulateKey("Enter", { metaKey: true })}>⌘↵</button>
        </div>
        <div className="debug-controls-row">
          <span className="debug-label">History:</span>
          <button onClick={() => simulateKey("z", { metaKey: true })}>⌘Z</button>
          <button onClick={() => simulateKey("z", { metaKey: true, shiftKey: true })}>⇧⌘Z</button>
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
