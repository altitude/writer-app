import React, { useEffect, useMemo, useRef, useState } from "react";

import { useDebug } from "./DebugContext";
import {
  DocumentAST,
  parseDocument,
  getWordIndexAtPosition,
  getSentenceIndexAtPosition,
  getWordSelectionRange,
  getSentenceSelectionRange,
  isCharInSelectedSentences,
} from "./DocumentAST";
import { useVirtualKeyboard, VirtualKeyEvent } from "./VirtualKeyboard";

interface EditorProps {
  initialText?: string;
  initialCommittedSentences?: number[];
}

interface HistoryState {
  text: string;
  cursorPosition: number;
  ghostRanges: { start: number; end: number }[];
  committedSentences: Set<number>;
}

const BATCH_THRESHOLD = 500; // ms - keystrokes within this window are batched
const MAX_HISTORY = 100;

const WORD_BOUNDARY = /[ ,;.?!\n—()]/;
const SENTENCE_END = /[.?!]/;

// Find next/previous word boundary for cursor movement
const findWordBoundary = (pos: number, text: string, direction: 1 | -1): number => {
  let i = pos;
  
  if (direction > 0) {
    // Moving right: skip current word chars, then skip separators
    while (i < text.length && !WORD_BOUNDARY.test(text[i])) i++;
    while (i < text.length && WORD_BOUNDARY.test(text[i])) i++;
  } else {
    // Moving left: skip separators behind us, then skip word chars
    i = pos - 1;
    while (i >= 0 && WORD_BOUNDARY.test(text[i])) i--;
    while (i >= 0 && !WORD_BOUNDARY.test(text[i])) i--;
    i++; // Move to start of word
  }
  
  return Math.max(0, Math.min(text.length, i));
};

// Find next/previous sentence boundary for cursor movement
const findSentenceBoundary = (pos: number, text: string, direction: 1 | -1): number => {
  let i = pos;
  
  if (direction > 0) {
    // Moving right: find next sentence end followed by space/newline
    while (i < text.length) {
      if (SENTENCE_END.test(text[i]) && (i + 1 >= text.length || /[\s\n]/.test(text[i + 1]))) {
        return Math.min(text.length, i + 2);
      }
      i++;
    }
    return text.length;
  } else {
    // Moving left: find previous sentence end, then go to start of that sentence
    // First, skip back past any sentence-end punctuation we might be right after
    i = pos - 1;
    while (i >= 0 && /[\s\n]/.test(text[i])) i--;
    if (i >= 0 && SENTENCE_END.test(text[i])) i--;
    
    // Now find the previous sentence end
    while (i >= 0) {
      if (SENTENCE_END.test(text[i]) && i + 1 < text.length && /[\s\n]/.test(text[i + 1])) {
        return i + 2; // Position after the ". "
      }
      i--;
    }
    return 0; // Beginning of text
  }
};

// Find line boundaries and column for vertical cursor movement
const getLineInfo = (pos: number, text: string) => {
  // Find start of current line
  let lineStart = pos;
  while (lineStart > 0 && text[lineStart - 1] !== '\n') {
    lineStart--;
  }
  
  // Find end of current line
  let lineEnd = pos;
  while (lineEnd < text.length && text[lineEnd] !== '\n') {
    lineEnd++;
  }
  
  // Column is distance from line start
  const column = pos - lineStart;
  
  return { lineStart, lineEnd, column };
};

// Adjust ghost ranges after text insertion/deletion
const adjustRanges = (
  ranges: { start: number; end: number }[],
  changePos: number,
  delta: number // positive for insertion, negative for deletion
): { start: number; end: number }[] => {
  return ranges
    .map((range) => {
      if (delta > 0) {
        // Insertion at changePos
        if (range.start >= changePos) {
          return { start: range.start + delta, end: range.end + delta };
        } else if (range.end > changePos) {
          return { start: range.start, end: range.end + delta };
        }
        return range;
      } else {
        // Deletion from changePos to changePos + |delta|
        const delEnd = changePos - delta; // changePos + |delta|
        if (range.end <= changePos) {
          // Entirely before deletion
          return range;
        } else if (range.start >= delEnd) {
          // Entirely after deletion
          return { start: range.start + delta, end: range.end + delta };
        } else if (range.start >= changePos && range.end <= delEnd) {
          // Entirely within deletion - remove it
          return null;
        } else if (range.start < changePos && range.end > delEnd) {
          // Deletion is within the range
          return { start: range.start, end: range.end + delta };
        } else if (range.start < changePos) {
          // Range starts before and ends within deletion
          return { start: range.start, end: changePos };
        } else {
          // Range starts within and ends after deletion
          return { start: changePos, end: range.end + delta };
        }
      }
    })
    .filter((r): r is { start: number; end: number } => r !== null && r.start < r.end);
};

// Check if a character position is within any ghost range (marked for deletion)
const isInGhostRange = (
  pos: number,
  ranges: { start: number; end: number }[]
): boolean => {
  return ranges.some((r) => pos >= r.start && pos < r.end);
};

// Move cursor up/down by one line, preserving column position
const moveCursorVertically = (pos: number, text: string, direction: 1 | -1): number => {
  const { lineStart, lineEnd, column } = getLineInfo(pos, text);
  
  if (direction < 0) {
    // Moving up
    if (lineStart === 0) {
      // Already on first line, go to start
      return 0;
    }
    // Find the previous line
    const prevLineEnd = lineStart - 1; // Position of \n before current line
    let prevLineStart = prevLineEnd;
    while (prevLineStart > 0 && text[prevLineStart - 1] !== '\n') {
      prevLineStart--;
    }
    const prevLineLength = prevLineEnd - prevLineStart;
    // Move to same column or end of line if shorter
    return prevLineStart + Math.min(column, prevLineLength);
  } else {
    // Moving down
    if (lineEnd >= text.length) {
      // Already on last line, go to end
      return text.length;
    }
    // Find the next line
    const nextLineStart = lineEnd + 1; // Position after \n
    let nextLineEnd = nextLineStart;
    while (nextLineEnd < text.length && text[nextLineEnd] !== '\n') {
      nextLineEnd++;
    }
    const nextLineLength = nextLineEnd - nextLineStart;
    // Move to same column or end of line if shorter
    return nextLineStart + Math.min(column, nextLineLength);
  }
};

export const Editor = ({ initialText = "", initialCommittedSentences = [] }: EditorProps) => {
  const [text, setText] = useState(initialText);
  const textRef = useRef(text);
  textRef.current = text;

  // Parse document into AST (memoized - only recalculates when text changes)
  const ast = useMemo(() => parseDocument(text), [text]);
  const astRef = useRef(ast);
  astRef.current = ast;

  const [cursorPosition, setCursorPosition] = useState(text.length);
  const cursorRef = useRef(cursorPosition);
  cursorRef.current = cursorPosition;

  const [wordSelection, setWordSelection] = useState(null as { start: number; end: number; direction: 'left' | 'right' } | null);
  const wordSelectionRef = useRef(wordSelection);
  wordSelectionRef.current = wordSelection;

  const [sentenceSelection, setSentenceSelection] = useState(null as { start: number; end: number; direction: 'left' | 'right' } | null);
  const sentenceSelectionRef = useRef(sentenceSelection);
  sentenceSelectionRef.current = sentenceSelection;

  // Track which sentences are committed (by index). Uncommitted sentences are faded.
  const [committedSentences, setCommittedSentences] = useState<Set<number>>(new Set(initialCommittedSentences));
  const committedSentencesRef = useRef(committedSentences);
  committedSentencesRef.current = committedSentences;

  // Track ghost ranges (text marked for deletion from typing over committed selection)
  const [ghostRanges, setGhostRanges] = useState<{ start: number; end: number }[]>([]);
  const ghostRangesRef = useRef(ghostRanges);
  ghostRangesRef.current = ghostRanges;

  // Undo/Redo history stacks
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const undoStackRef = useRef(undoStack);
  undoStackRef.current = undoStack;
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const redoStackRef = useRef(redoStack);
  redoStackRef.current = redoStack;
  const lastEditTimeRef = useRef<number>(0);

  const { setData: setDebugData } = useDebug();
  const { subscribe } = useVirtualKeyboard();

  const clearSelections = () => {
    setWordSelection(null);
    setSentenceSelection(null);
  };

  // Save current state to undo history before making changes
  // force=true starts a new undo group, otherwise batches rapid typing
  const saveHistory = (force = false) => {
    const now = Date.now();
    const shouldBatch = !force && (now - lastEditTimeRef.current) < BATCH_THRESHOLD;
    lastEditTimeRef.current = now;

    // If batching and we have history, don't create new entry
    if (shouldBatch && undoStackRef.current.length > 0) return;

    const currentState: HistoryState = {
      text: textRef.current,
      cursorPosition: cursorRef.current,
      ghostRanges: [...ghostRangesRef.current],
      committedSentences: new Set(committedSentencesRef.current),
    };

    setUndoStack(prev => [...prev.slice(-(MAX_HISTORY - 1)), currentState]);
    setRedoStack([]); // Clear redo on new edit
  };

  // Restore a history state
  const restoreState = (state: HistoryState) => {
    setText(state.text);
    textRef.current = state.text;
    setCursorPosition(state.cursorPosition);
    cursorRef.current = state.cursorPosition;
    setGhostRanges([...state.ghostRanges]);
    ghostRangesRef.current = [...state.ghostRanges];
    setCommittedSentences(new Set(state.committedSentences));
    committedSentencesRef.current = new Set(state.committedSentences);
    clearSelections();
  };

  useEffect(() => {
    const handleKeyDown = (event: VirtualKeyEvent) => {
      const currentAst = astRef.current;
      
      // Undo: Cmd+Z
      if (event.metaKey && !event.shiftKey && event.key.toLowerCase() === "z") {
        const currentUndoStack = undoStackRef.current;
        if (currentUndoStack.length > 0) {
          // Save current state to redo stack
          const currentState: HistoryState = {
            text: textRef.current,
            cursorPosition: cursorRef.current,
            ghostRanges: [...ghostRangesRef.current],
            committedSentences: new Set(committedSentencesRef.current),
          };
          setRedoStack(prev => [...prev, currentState]);
          
          // Pop from undo stack and restore
          const prevState = currentUndoStack[currentUndoStack.length - 1];
          setUndoStack(prev => prev.slice(0, -1));
          restoreState(prevState);
        }
        return;
      }
      
      // Redo: Cmd+Shift+Z
      if (event.metaKey && event.shiftKey && event.key.toLowerCase() === "z") {
        const currentRedoStack = redoStackRef.current;
        if (currentRedoStack.length > 0) {
          // Save current state to undo stack
          const currentState: HistoryState = {
            text: textRef.current,
            cursorPosition: cursorRef.current,
            ghostRanges: [...ghostRangesRef.current],
            committedSentences: new Set(committedSentencesRef.current),
          };
          setUndoStack(prev => [...prev, currentState]);
          
          // Pop from redo stack and restore
          const nextState = currentRedoStack[currentRedoStack.length - 1];
          setRedoStack(prev => prev.slice(0, -1));
          restoreState(nextState);
        }
        return;
      }
      
      // Word selection: Shift + Option + Arrow (select and extend)
      if (event.shiftKey && event.altKey && event.key === "ArrowRight") {
        setWordSelection((prev) => {
          const wordCount = currentAst.words.length;
          if (!prev) {
            const wordIdx = getWordIndexAtPosition(currentAst, cursorRef.current);
            // If already at/past last word, nothing to select rightward
            if (wordIdx >= wordCount - 1 && cursorRef.current >= currentAst.text.length) return null;
            return { start: wordIdx, end: wordIdx, direction: 'right' };
          }
          const newEnd = prev.end + 1;
          // If direction was left and we're crossing past start, clear
          if (prev.direction === 'left' && newEnd > prev.start) return null;
          // Bounds check - clamp, don't clear
          if (newEnd >= wordCount) return prev; // Stay at bounds
          return { ...prev, end: newEnd };
        });
      } else if (event.shiftKey && event.altKey && event.key === "ArrowLeft") {
        setWordSelection((prev) => {
          if (!prev) {
            let wordIdx = getWordIndexAtPosition(currentAst, cursorRef.current);
            // If cursor is at position 0, nothing to select leftward
            if (cursorRef.current === 0) return null;
            // If cursor is exactly at the start of a word, select the previous word
            const currentWord = currentAst.words[wordIdx];
            if (currentWord && cursorRef.current === currentWord.charStart && wordIdx > 0) {
              wordIdx = wordIdx - 1;
            }
            return { start: wordIdx, end: wordIdx, direction: 'left' };
          }
          const newEnd = prev.end - 1;
          // If direction was right and we're crossing past start, clear
          if (prev.direction === 'right' && newEnd < prev.start) return null;
          // Bounds check - clamp, don't clear
          if (newEnd < 0) return prev; // Stay at bounds
          return { ...prev, end: newEnd };
        });
      }
      // Sentence selection: Cmd + Shift + Arrow (select and extend)
      else if (event.shiftKey && event.metaKey && event.key === "ArrowRight") {
        setSentenceSelection((prev) => {
          const sentenceCount = currentAst.sentences.length;
          if (!prev) {
            const sentenceIdx = getSentenceIndexAtPosition(currentAst, cursorRef.current);
            // If cursor is at/past the end of text, nothing to select rightward
            if (cursorRef.current >= currentAst.text.length) return null;
            // If already at the last sentence and cursor is past its start, check if there's more
            if (sentenceIdx >= sentenceCount - 1) {
              const lastSentence = currentAst.sentences[sentenceCount - 1];
              if (lastSentence && cursorRef.current >= lastSentence.charEnd) return null;
            }
            return { start: sentenceIdx, end: sentenceIdx, direction: 'right' };
          }
          const newEnd = prev.end + 1;
          // If direction was left and we're crossing past start, clear
          if (prev.direction === 'left' && newEnd > prev.start) return null;
          // Bounds check - clamp, don't clear
          if (newEnd >= sentenceCount) return prev; // Stay at bounds
          return { ...prev, end: newEnd };
        });
      } else if (event.shiftKey && event.metaKey && event.key === "ArrowLeft") {
        setSentenceSelection((prev) => {
          if (!prev) {
            const sentenceIdx = getSentenceIndexAtPosition(currentAst, cursorRef.current);
            // If cursor is at position 0, nothing to select leftward
            if (cursorRef.current === 0) return null;
            return { start: sentenceIdx, end: sentenceIdx, direction: 'left' };
          }
          const newEnd = prev.end - 1;
          // If direction was right and we're crossing past start, clear
          if (prev.direction === 'right' && newEnd < prev.start) return null;
          // Bounds check - clamp, don't clear
          if (newEnd < 0) return prev; // Stay at bounds
          return { ...prev, end: newEnd };
        });
      }
      // Sentence cursor movement: Cmd + Arrow
      else if (event.metaKey && event.key === "ArrowRight") {
        clearSelections();
        const newPos = findSentenceBoundary(cursorRef.current, textRef.current, 1);
        cursorRef.current = newPos;
        setCursorPosition(newPos);
      } else if (event.metaKey && event.key === "ArrowLeft") {
        clearSelections();
        const newPos = findSentenceBoundary(cursorRef.current, textRef.current, -1);
        cursorRef.current = newPos;
        setCursorPosition(newPos);
      }
      // Word cursor movement: Option + Arrow
      else if (event.altKey && event.key === "ArrowRight") {
        clearSelections();
        const newPos = findWordBoundary(cursorRef.current, textRef.current, 1);
        cursorRef.current = newPos;
        setCursorPosition(newPos);
      } else if (event.altKey && event.key === "ArrowLeft") {
        clearSelections();
        const newPos = findWordBoundary(cursorRef.current, textRef.current, -1);
        cursorRef.current = newPos;
        setCursorPosition(newPos);
      }
      // Character cursor movement: Arrow
      else if (event.key === "ArrowRight") {
        clearSelections();
        setCursorPosition((prev) => Math.min(prev + 1, textRef.current.length));
      } else if (event.key === "ArrowLeft") {
        clearSelections();
        setCursorPosition((prev) => Math.max(prev - 1, 0));
      }

      // Line navigation: Ctrl+A (beginning) and Ctrl+E (end)
      if (event.ctrlKey && event.key === "a") {
        clearSelections();
        const text = textRef.current;
        const pos = cursorRef.current;
        // Find beginning of line (after previous \n or start of text)
        let lineStart = pos;
        while (lineStart > 0 && text[lineStart - 1] !== "\n") {
          lineStart--;
        }
        cursorRef.current = lineStart;
        setCursorPosition(lineStart);
      } else if (event.ctrlKey && event.key === "e") {
        clearSelections();
        const text = textRef.current;
        const pos = cursorRef.current;
        // Find end of line (before next \n or end of text)
        let lineEnd = pos;
        while (lineEnd < text.length && text[lineEnd] !== "\n") {
          lineEnd++;
        }
        cursorRef.current = lineEnd;
        setCursorPosition(lineEnd);
      }

      if (event.key === "Escape") {
        clearSelections();
      }

      // Sentence reordering: ArrowUp/ArrowDown when sentence is selected
      if (event.key === "ArrowUp" && sentenceSelectionRef.current) {
        const selection = sentenceSelectionRef.current;
        const minIdx = Math.min(selection.start, selection.end);
        const maxIdx = Math.max(selection.start, selection.end);
        
        // Can't move up if already at the top
        if (minIdx > 0) {
          saveHistory(true); // Force new undo group for sentence reorder
          const sentences = currentAst.sentences;
          const prevSentence = sentences[minIdx - 1];
          const firstSelected = sentences[minIdx];
          const lastSelected = sentences[maxIdx];
          const afterSelected = sentences[maxIdx + 1];
          
          const currentText = textRef.current;
          
          // Extract the actual sentence texts
          const prevSentenceText = currentText.slice(prevSentence.charStart, prevSentence.charEnd);
          const selectedSentencesText = currentText.slice(firstSelected.charStart, lastSelected.charEnd);
          
          // Get the separator between prev and selected (preserve newlines)
          const sepBetweenPrevAndSelected = currentText.slice(prevSentence.charEnd, firstSelected.charStart) || " ";
          // Get the separator after selected (before next sentence or end)
          const sepAfterSelected = afterSelected 
            ? currentText.slice(lastSelected.charEnd, afterSelected.charStart)
            : "";
          
          // Everything before the prev sentence
          const before = currentText.slice(0, prevSentence.charStart);
          // Everything after (starting from next sentence)
          const after = afterSelected ? currentText.slice(afterSelected.charStart) : "";
          
          // Rebuild: [before] + [selected] + [sep1] + [prev] + [sep2] + [after]
          let newText = before + selectedSentencesText + sepBetweenPrevAndSelected + prevSentenceText;
          if (after.length > 0) {
            newText += sepAfterSelected + after;
          }
          
          setText(newText);
          // Clear ghost ranges on reorder (positions become invalid)
          setGhostRanges([]);
          
          // Update selection to follow the moved sentence
          const newMinIdx = minIdx - 1;
          const newMaxIdx = maxIdx - 1;
          setSentenceSelection({
            ...selection,
            start: selection.direction === 'right' ? newMinIdx : newMaxIdx,
            end: selection.direction === 'right' ? newMaxIdx : newMinIdx,
          });
          
          // Update committed sentences indices after reorder
          // Moving up: selected sentences move from [minIdx..maxIdx] to [minIdx-1..maxIdx-1]
          // The previous sentence (minIdx-1) moves to maxIdx
          setCommittedSentences(prev => {
            const next = new Set<number>();
            for (const idx of prev) {
              if (idx >= minIdx && idx <= maxIdx) {
                // Selected sentences move up by 1
                next.add(idx - 1);
              } else if (idx === minIdx - 1) {
                // Previous sentence moves to where last selected was
                next.add(maxIdx);
              } else {
                // Other sentences stay the same
                next.add(idx);
              }
            }
            return next;
          });
          
          // Move cursor to start of moved sentence
          cursorRef.current = before.length;
          setCursorPosition(before.length);
        }
      } else if (event.key === "ArrowUp" && !sentenceSelectionRef.current) {
        // Move cursor up one line
        clearSelections();
        const newPos = moveCursorVertically(cursorRef.current, textRef.current, -1);
        cursorRef.current = newPos;
        setCursorPosition(newPos);
      }
      
      if (event.key === "ArrowDown" && sentenceSelectionRef.current) {
        const selection = sentenceSelectionRef.current;
        const minIdx = Math.min(selection.start, selection.end);
        const maxIdx = Math.max(selection.start, selection.end);
        
        // Can't move down if already at the bottom
        if (maxIdx < currentAst.sentences.length - 1) {
          saveHistory(true); // Force new undo group for sentence reorder
          const sentences = currentAst.sentences;
          const firstSelected = sentences[minIdx];
          const lastSelected = sentences[maxIdx];
          const nextSentence = sentences[maxIdx + 1];
          const afterNext = sentences[maxIdx + 2];
          
          const currentText = textRef.current;
          
          // Extract the actual sentence texts
          const selectedSentencesText = currentText.slice(firstSelected.charStart, lastSelected.charEnd);
          const nextSentenceText = currentText.slice(nextSentence.charStart, nextSentence.charEnd);
          
          // Get the separator between selected and next (preserve newlines)
          const sepBetweenSelectedAndNext = currentText.slice(lastSelected.charEnd, nextSentence.charStart) || " ";
          // Get the separator after next (before following sentence or end)
          const sepAfterNext = afterNext
            ? currentText.slice(nextSentence.charEnd, afterNext.charStart)
            : "";
          
          // Everything before the selected sentences
          const before = currentText.slice(0, firstSelected.charStart);
          // Everything after (starting from sentence after next)
          const after = afterNext ? currentText.slice(afterNext.charStart) : "";
          
          // Rebuild: [before] + [next] + [sep1] + [selected] + [sep2] + [after]
          let newText = before + nextSentenceText + sepBetweenSelectedAndNext + selectedSentencesText;
          if (after.length > 0) {
            newText += sepAfterNext + after;
          }
          
          setText(newText);
          // Clear ghost ranges on reorder (positions become invalid)
          setGhostRanges([]);
          
          // Update selection to follow the moved sentence
          const newMinIdx = minIdx + 1;
          const newMaxIdx = maxIdx + 1;
          setSentenceSelection({
            ...selection,
            start: selection.direction === 'right' ? newMinIdx : newMaxIdx,
            end: selection.direction === 'right' ? newMaxIdx : newMinIdx,
          });
          
          // Update committed sentences indices after reorder
          // Moving down: selected sentences move from [minIdx..maxIdx] to [minIdx+1..maxIdx+1]
          // The next sentence (maxIdx+1) moves to minIdx
          setCommittedSentences(prev => {
            const next = new Set<number>();
            for (const idx of prev) {
              if (idx >= minIdx && idx <= maxIdx) {
                // Selected sentences move down by 1
                next.add(idx + 1);
              } else if (idx === maxIdx + 1) {
                // Next sentence moves to where first selected was
                next.add(minIdx);
              } else {
                // Other sentences stay the same
                next.add(idx);
              }
            }
            return next;
          });
          
          // Move cursor to new position of moved sentence
          const newPos = before.length + nextSentenceText.length + sepBetweenSelectedAndNext.length;
          cursorRef.current = newPos;
          setCursorPosition(newPos);
        }
      } else if (event.key === "ArrowDown" && !sentenceSelectionRef.current) {
        // Move cursor down one line
        clearSelections();
        const newPos = moveCursorVertically(cursorRef.current, textRef.current, 1);
        cursorRef.current = newPos;
        setCursorPosition(newPos);
      }

      if (event.key === "Backspace") {
        saveHistory(true); // Force new undo group for backspace
        const currentText = textRef.current;
        const currentSentenceSelection = sentenceSelectionRef.current;
        const currentWordSelection = wordSelectionRef.current;
        const currentGhostRanges = ghostRangesRef.current;
        
        // Check if there's a selection to delete
        if (currentSentenceSelection) {
          const range = getSentenceSelectionRange(currentAst, currentSentenceSelection);
          const minIdx = Math.min(currentSentenceSelection.start, currentSentenceSelection.end);
          const maxIdx = Math.max(currentSentenceSelection.start, currentSentenceSelection.end);
          const deletedCount = maxIdx - minIdx + 1;
          const deleteLength = range.end - range.start;
          
          setText((prev) => prev.slice(0, range.start) + prev.slice(range.end));
          setGhostRanges(adjustRanges(currentGhostRanges, range.start, -deleteLength));
          cursorRef.current = range.start;
          setCursorPosition(range.start);
          
          // Update committed sentences after deletion
          setCommittedSentences(prev => {
            const next = new Set<number>();
            for (const idx of prev) {
              if (idx < minIdx) {
                // Before deleted range: stays the same
                next.add(idx);
              } else if (idx > maxIdx) {
                // After deleted range: shift down by number of deleted sentences
                next.add(idx - deletedCount);
              }
              // Indices within deleted range are simply not added
            }
            return next;
          });
          
          clearSelections();
        } else if (currentWordSelection) {
          const range = getWordSelectionRange(currentAst, currentWordSelection);
          const deleteLength = range.end - range.start;
          setText((prev) => prev.slice(0, range.start) + prev.slice(range.end));
          setGhostRanges(adjustRanges(currentGhostRanges, range.start, -deleteLength));
          cursorRef.current = range.start;
          setCursorPosition(range.start);
          clearSelections();
        } else if (cursorRef.current > 0) {
          // No selection - delete based on modifiers
          const pos = cursorRef.current;
          
          if (event.metaKey) {
            // Cmd + Backspace: Delete to beginning of sentence
            const sentenceStart = findSentenceBoundary(pos, currentText, -1);
            const deleteLength = pos - sentenceStart;
            setText((prev) => prev.slice(0, sentenceStart) + prev.slice(pos));
            setGhostRanges(adjustRanges(currentGhostRanges, sentenceStart, -deleteLength));
            cursorRef.current = sentenceStart;
            setCursorPosition(sentenceStart);
          } else if (event.altKey) {
            // Option + Backspace: Delete word backwards
            const newPos = findWordBoundary(pos, currentText, -1);
            const deleteLength = pos - newPos;
            setText((prev) => prev.slice(0, newPos) + prev.slice(pos));
            setGhostRanges(adjustRanges(currentGhostRanges, newPos, -deleteLength));
            cursorRef.current = newPos;
            setCursorPosition(newPos);
          } else {
            // Plain Backspace: Delete single character
            setText((prev) => prev.slice(0, pos - 1) + prev.slice(pos));
            setGhostRanges(adjustRanges(currentGhostRanges, pos - 1, -1));
            cursorRef.current = pos - 1;
            setCursorPosition(pos - 1);
          }
        }
      } else if (event.key === "Enter" && event.metaKey) {
        saveHistory(true); // Force new undo group for commit toggle
        // Cmd+Enter: Toggle commit state for current sentence or selected sentences
        const currentSentenceSelection = sentenceSelectionRef.current;
        const currentCommitted = committedSentencesRef.current;
        
        if (currentSentenceSelection) {
          // Toggle all selected sentences
          const minIdx = Math.min(currentSentenceSelection.start, currentSentenceSelection.end);
          const maxIdx = Math.max(currentSentenceSelection.start, currentSentenceSelection.end);
          
          // Check if ALL selected sentences are committed
          let allCommitted = true;
          for (let i = minIdx; i <= maxIdx; i++) {
            if (!currentCommitted.has(i)) {
              allCommitted = false;
              break;
            }
          }
          
          setCommittedSentences(prev => {
            const next = new Set(prev);
            for (let i = minIdx; i <= maxIdx; i++) {
              if (allCommitted) {
                next.delete(i); // Uncommit
              } else {
                next.add(i); // Commit
              }
            }
            return next;
          });
          clearSelections();
        } else {
          // Toggle the sentence at cursor position
          const sentenceIdx = getSentenceIndexAtPosition(currentAst, cursorRef.current);
          setCommittedSentences(prev => {
            const next = new Set(prev);
            if (next.has(sentenceIdx)) {
              next.delete(sentenceIdx); // Uncommit
            } else {
              next.add(sentenceIdx); // Commit
            }
            return next;
          });
        }
      } else if (event.key === "Enter") {
        saveHistory(true); // Force new undo group for newline
        clearSelections();
        const pos = cursorRef.current;
        setText((prev) => prev.slice(0, pos) + "\n" + prev.slice(pos));
        setGhostRanges(adjustRanges(ghostRangesRef.current, pos, 1));
        cursorRef.current = pos + 1;
        setCursorPosition(pos + 1);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        saveHistory(); // Batch rapid typing into single undo group
        const currentSentenceSelection = sentenceSelectionRef.current;
        const currentWordSelection = wordSelectionRef.current;
        const currentText = textRef.current;
        const currentCommitted = committedSentencesRef.current;
        const currentGhostRanges = ghostRangesRef.current;
        
        // Check if there's a selection
        if (currentSentenceSelection || currentWordSelection) {
          // Get the selection range
          const range = currentSentenceSelection
            ? getSentenceSelectionRange(currentAst, currentSentenceSelection)
            : getWordSelectionRange(currentAst, currentWordSelection!);
          
          // Check if the selection is in a committed sentence
          const sentenceIdx = getSentenceIndexAtPosition(currentAst, range.start);
          const isCommitted = currentCommitted.has(sentenceIdx);
          
          if (isCommitted) {
            // Committed sentence: keep old text as ghost (strikethrough), insert new text after
            // Add a space separator between old and new text (space is part of ghost text)
            const insertPos = range.end;
            const spacer = /[a-zA-Z0-9]/.test(event.key) ? " " : "";
            const newText = spacer + event.key;
            
            setText((prev) => prev.slice(0, insertPos) + newText + prev.slice(insertPos));
            
            // Mark the old range + spacer as ghost (for deletion)
            const newGhostRange = { start: range.start, end: range.end + spacer.length };
            // Update ghost ranges (shift those after insertion point)
            const adjusted = adjustRanges(currentGhostRanges, insertPos, newText.length);
            setGhostRanges([...adjusted, newGhostRange]);
            
            cursorRef.current = insertPos + newText.length;
            setCursorPosition(insertPos + newText.length);
          } else {
            // Uncommitted sentence: normal replace behavior
            setText((prev) => prev.slice(0, range.start) + event.key + prev.slice(range.end));
            
            // Update ghost ranges
            const delta = 1 - (range.end - range.start);
            setGhostRanges(adjustRanges(currentGhostRanges, range.start, delta));
            
            cursorRef.current = range.start + 1;
            setCursorPosition(range.start + 1);
          }
          clearSelections();
        } else {
          // No selection: normal insert
          const pos = cursorRef.current;
          setText((prev) => prev.slice(0, pos) + event.key + prev.slice(pos));
          setGhostRanges(adjustRanges(currentGhostRanges, pos, 1));
          cursorRef.current = pos + 1;
          setCursorPosition(pos + 1);
        }
      }
    };

    return subscribe(handleKeyDown);
  }, [subscribe]);

  useEffect(() => {
    setDebugData({
      source: "Editor",
      cursorPosition,
      wordSelection,
      sentenceSelection,
      ghostRanges,
      ast: {
        sentences: ast.sentences.map(s => ({
          index: s.index,
          text: text.slice(s.charStart, s.charEnd),
          range: [s.charStart, s.charEnd],
          committed: committedSentences.has(s.index),
          tokens: s.tokens.map(t => ({
            type: t.type,
            text: t.text,
            range: [t.charStart, t.charEnd],
          })),
        })),
        wordCount: ast.words.length,
        sentenceCount: ast.sentences.length,
        committedCount: committedSentences.size,
      },
    });
  }, [ast, committedSentences, cursorPosition, sentenceSelection, setDebugData, text, ghostRanges, wordSelection]);

  const isWordSelected = (index: number) => {
    if (!wordSelection) return false;
    const min = Math.min(wordSelection.start, wordSelection.end);
    const max = Math.max(wordSelection.start, wordSelection.end);
    return index >= min && index <= max;
  };

  const renderText = (ast: DocumentAST) => {
    const { text, words, sentences } = ast;
    const elements: React.ReactNode[] = [];

    let charIndex = 0;

    // Iterate through all tokens from all sentences
    for (const sentence of sentences) {
      // Check if this sentence is uncommitted (not in committedSentences set)
      const isSentenceUncommitted = !committedSentences.has(sentence.index);
      
      for (const token of sentence.tokens) {
        // Skip if we've already processed this position (overlapping)
        if (token.charStart < charIndex) continue;
        
        const tokenStart = token.charStart;
        const tokenEnd = token.charEnd;
        const isSeparator = token.type === 'separator';
        
        // Find word index for this token if it's a word
        const wordIndex = token.type === 'word' 
          ? words.findIndex(w => w.charStart === token.charStart)
          : -1;

        const isUncommitted = isSentenceUncommitted;
        const isWordSel = wordIndex !== -1 && isWordSelected(wordIndex);
        
        // Check if between two selected words (for separator highlighting)
        let isSeparatorBetweenSelectedWords = false;
        if (isSeparator && wordSelection) {
          const wordBefore = words.findIndex(w => w.charEnd <= tokenStart && 
            (words[words.indexOf(w) + 1]?.charStart ?? Infinity) > tokenStart);
          const wordAfter = wordBefore + 1;
          if (wordBefore >= 0 && wordAfter < words.length) {
            isSeparatorBetweenSelectedWords = isWordSelected(wordBefore) && isWordSelected(wordAfter);
          }
        }

        // Check if any part of this token is in a ghost range
        const hasGhostRange = ghostRanges.some(
          (r) => r.start < tokenEnd && r.end > tokenStart
        );

        // For separator tokens with sentence selection OR tokens with ghost ranges, render character-by-character
        if ((isSeparator && sentenceSelection) || hasGhostRange) {
          for (let i = 0; i < token.text.length; i++) {
            const charPos = tokenStart + i;
            const char = token.text[i];
            // Include word selection (isWordSel) in char-by-char rendering
            const isCharSelected = isWordSel || isSeparatorBetweenSelectedWords || 
              (sentenceSelection ? isCharInSelectedSentences(ast, charPos, sentenceSelection) : false);
            const isCharGhost = isInGhostRange(charPos, ghostRanges);
            const charClasses = [
              isCharSelected ? "selected" : "",
              isCharGhost ? "ghost" : (isUncommitted ? "uncommitted" : ""),
            ].filter(Boolean).join(' ');
            
            if (cursorPosition === charPos) {
              elements.push(
                <span key={`${tokenStart}-${i}`} className={charClasses}>
                  <span className="cursor"></span>
                  {char}
                </span>
              );
            } else {
              elements.push(<span key={`${tokenStart}-${i}`} className={charClasses}>{char}</span>);
            }
          }
        } else {
          const isInSelectedSentence = sentenceSelection 
            ? isCharInSelectedSentences(ast, tokenStart, sentenceSelection)
            : false;
          const isSelected = isWordSel || isSeparatorBetweenSelectedWords || isInSelectedSentence;
          
          const classes = [
            isSelected ? "selected" : "",
            isUncommitted ? "uncommitted" : "",
          ].filter(Boolean).join(' ');

          // Check if cursor is within this token
          if (cursorPosition >= tokenStart && cursorPosition < tokenEnd) {
            const cursorOffset = cursorPosition - tokenStart;
            const beforeCursor = token.text.slice(0, cursorOffset);
            const afterCursor = token.text.slice(cursorOffset);

            elements.push(
              <span key={tokenStart} className={classes}>
                {beforeCursor}
                <span className="cursor"></span>
                {afterCursor}
              </span>
            );
          } else {
            elements.push(<span key={tokenStart} className={classes}>{token.text}</span>);
          }
        }

        charIndex = tokenEnd;
      }
    }

    // If cursor is at the very end (after all text)
    if (cursorPosition >= text.length) {
      elements.push(<span key="cursor-end" className="cursor"></span>);
    }

    return elements;
  };

  return (
    <div className="editor-container">
      <pre>{renderText(ast)}</pre>
    </div>
  );
};
