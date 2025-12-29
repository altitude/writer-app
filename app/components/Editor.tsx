import React, { useEffect, useRef, useState } from "react";

import { useDebug } from "./DebugContext";
import { useVirtualKeyboard, VirtualKeyEvent } from "./VirtualKeyboard";

interface EditorProps {
  initialText?: string;
}

const WORD_SEPARATORS = /^[ ,;.?!\n]+$/;
const WORD_BOUNDARY = /[ ,;.?!\n]/;
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

export const Editor = ({ initialText = "" }: EditorProps) => {
  const [text, setText] = useState(initialText);
  const textRef = useRef(text);
  textRef.current = text;

  const [cursorPosition, setCursorPosition] = useState(text.length);
  const cursorRef = useRef(cursorPosition);
  cursorRef.current = cursorPosition;

  const [wordSelection, setWordSelection] = useState(null as { start: number; end: number; direction: 'left' | 'right' } | null);
  const wordSelectionRef = useRef(wordSelection);
  wordSelectionRef.current = wordSelection;

  const [sentenceSelection, setSentenceSelection] = useState(null as { start: number; end: number; direction: 'left' | 'right' } | null);
  const sentenceSelectionRef = useRef(sentenceSelection);
  sentenceSelectionRef.current = sentenceSelection;

  const { setData: setDebugData } = useDebug();
  const { subscribe } = useVirtualKeyboard();

  // Get sentence boundaries as character positions
  const getSentenceBoundaries = (currentText: string): number[] => {
    const boundaries = [0];
    for (let i = 0; i < currentText.length; i++) {
      if (SENTENCE_END.test(currentText[i]) && (i + 1 >= currentText.length || /[\s\n]/.test(currentText[i + 1]))) {
        boundaries.push(i + 1); // End right after punctuation, don't include trailing space
      }
    }
    if (boundaries[boundaries.length - 1] < currentText.length) {
      boundaries.push(currentText.length);
    }
    return boundaries;
  };

  // Get the sentence index at a character position
  const getSentenceIndexAtPosition = (pos: number, currentText: string): number => {
    const boundaries = getSentenceBoundaries(currentText);
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (pos >= boundaries[i] && pos < boundaries[i + 1]) {
        return i;
      }
    }
    return Math.max(0, boundaries.length - 2);
  };

  // Get the word index at or near a character position
  const getWordIndexAtPosition = (pos: number, currentText: string) => {
    const tokens = currentText.split(/([ ,;.?!\n]+)/);
    let charIndex = 0;
    let wordIndex = 0;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const tokenEnd = charIndex + token.length;
      const isWord = !WORD_SEPARATORS.test(token);
      
      if (isWord) {
        if (pos >= charIndex && pos <= tokenEnd) {
          return wordIndex;
        }
        if (pos < charIndex) {
          // Cursor is before this word, return previous word or this one
          return Math.max(0, wordIndex);
        }
        wordIndex++;
      }
      charIndex = tokenEnd;
    }
    
    // Cursor is at the end, return last word
    return Math.max(0, wordIndex - 1);
  };

  const clearSelections = () => {
    setWordSelection(null);
    setSentenceSelection(null);
  };

  // Get character range for a word selection
  const getWordSelectionRange = (selection: { start: number; end: number }, currentText: string): { start: number; end: number } => {
    const tokens = currentText.split(/([ ,;.?!\n]+)/);
    const minIdx = Math.min(selection.start, selection.end);
    const maxIdx = Math.max(selection.start, selection.end);
    
    let charIndex = 0;
    let wordIndex = 0;
    let rangeStart = 0;
    let rangeEnd = 0;
    
    for (const token of tokens) {
      const isWord = !WORD_SEPARATORS.test(token);
      if (isWord) {
        if (wordIndex === minIdx) {
          rangeStart = charIndex;
        }
        if (wordIndex === maxIdx) {
          rangeEnd = charIndex + token.length;
        }
        wordIndex++;
      }
      charIndex += token.length;
    }
    
    return { start: rangeStart, end: rangeEnd };
  };

  // Get character range for a sentence selection
  const getSentenceSelectionRange = (selection: { start: number; end: number }, currentText: string): { start: number; end: number } => {
    const boundaries = getSentenceBoundaries(currentText);
    const minIdx = Math.min(selection.start, selection.end);
    const maxIdx = Math.max(selection.start, selection.end);
    
    return {
      start: boundaries[minIdx],
      end: boundaries[maxIdx + 1] ?? currentText.length,
    };
  };

  useEffect(() => {
    const handleKeyDown = (event: VirtualKeyEvent) => {
      // Word selection: Shift + Option + Arrow (select and extend)
      if (event.shiftKey && event.altKey && event.key === "ArrowRight") {
        setWordSelection((prev) => {
          const tokens = textRef.current.split(/([ ,;.?!\n]+)/);
          const wordCount = tokens.filter(t => !WORD_SEPARATORS.test(t)).length;
          if (!prev) {
            const wordIdx = getWordIndexAtPosition(cursorRef.current, textRef.current);
            // If already at/past last word, nothing to select rightward
            if (wordIdx >= wordCount - 1 && cursorRef.current >= textRef.current.length) return null;
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
            const wordIdx = getWordIndexAtPosition(cursorRef.current, textRef.current);
            // If cursor is at position 0, nothing to select leftward
            if (cursorRef.current === 0) return null;
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
          const boundaries = getSentenceBoundaries(textRef.current);
          const sentenceCount = boundaries.length - 1;
          if (!prev) {
            const sentenceIdx = getSentenceIndexAtPosition(cursorRef.current, textRef.current);
            // If cursor is at/past the end of text, nothing to select rightward
            if (cursorRef.current >= textRef.current.length) return null;
            // If already at the last sentence and cursor is past its start, check if there's more
            if (sentenceIdx >= sentenceCount - 1) {
              const lastSentenceEnd = boundaries[sentenceCount];
              if (cursorRef.current >= lastSentenceEnd) return null;
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
            const sentenceIdx = getSentenceIndexAtPosition(cursorRef.current, textRef.current);
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

      if (event.key === "Escape" || event.key === "ArrowDown") {
        clearSelections();
      }

      if (event.key === "Backspace") {
        const currentText = textRef.current;
        const currentSentenceSelection = sentenceSelectionRef.current;
        const currentWordSelection = wordSelectionRef.current;
        
        // Check if there's a selection to delete
        if (currentSentenceSelection) {
          const range = getSentenceSelectionRange(currentSentenceSelection, currentText);
          setText((prev) => prev.slice(0, range.start) + prev.slice(range.end));
          cursorRef.current = range.start;
          setCursorPosition(range.start);
          clearSelections();
        } else if (currentWordSelection) {
          const range = getWordSelectionRange(currentWordSelection, currentText);
          setText((prev) => prev.slice(0, range.start) + prev.slice(range.end));
          cursorRef.current = range.start;
          setCursorPosition(range.start);
          clearSelections();
        } else if (cursorRef.current > 0) {
          // No selection - delete based on modifiers
          const pos = cursorRef.current;
          
          if (event.metaKey) {
            // Cmd + Backspace: Delete to beginning of sentence
            const sentenceStart = findSentenceBoundary(pos, currentText, -1);
            setText((prev) => prev.slice(0, sentenceStart) + prev.slice(pos));
            cursorRef.current = sentenceStart;
            setCursorPosition(sentenceStart);
          } else if (event.altKey) {
            // Option + Backspace: Delete word backwards
            const newPos = findWordBoundary(pos, currentText, -1);
            setText((prev) => prev.slice(0, newPos) + prev.slice(pos));
            cursorRef.current = newPos;
            setCursorPosition(newPos);
          } else {
            // Plain Backspace: Delete single character
            setText((prev) => prev.slice(0, pos - 1) + prev.slice(pos));
            cursorRef.current = pos - 1;
            setCursorPosition(pos - 1);
          }
        }
      } else if (event.key === "Enter") {
        clearSelections();
        const pos = cursorRef.current;
        setText((prev) => prev.slice(0, pos) + "\n" + prev.slice(pos));
        cursorRef.current = pos + 1;
        setCursorPosition(pos + 1);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        clearSelections();
        const pos = cursorRef.current;
        setText((prev) => prev.slice(0, pos) + event.key + prev.slice(pos));
        cursorRef.current = pos + 1;
        setCursorPosition(pos + 1);
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
      textLength: text.length,
    });
  }, [cursorPosition, sentenceSelection, setDebugData, text.length, wordSelection]);

  const isWordSelected = (index: number) => {
    if (!wordSelection) return false;
    const min = Math.min(wordSelection.start, wordSelection.end);
    const max = Math.max(wordSelection.start, wordSelection.end);
    return index >= min && index <= max;
  };

  const isSentenceSelected = (index: number) => {
    if (!sentenceSelection) return false;
    const min = Math.min(sentenceSelection.start, sentenceSelection.end);
    const max = Math.max(sentenceSelection.start, sentenceSelection.end);
    return index >= min && index <= max;
  };

  const renderText = (text: string) => {
    // Split on separators but keep them in the result
    const tokens = text.split(/([ ,;.?!\n]+)/);
    
    // Build a map of word index -> token index (skipping separators)
    const wordToToken: number[] = [];
    tokens.forEach((token, tokenIndex) => {
      if (!WORD_SEPARATORS.test(token)) {
        wordToToken.push(tokenIndex);
      }
    });

    const lastWordIndex = wordToToken.length - 1;
    const isLastWordCommitted = /[ ,;.?!\n]/.test(text.slice(-1));

    // Build sentence boundaries for sentence selection
    const sentenceBoundaries = getSentenceBoundaries(text);

    // Helper to check if a character position is in a selected sentence
    const isCharInSelectedSentence = (charPos: number) => {
      if (!sentenceSelection) return false;
      for (let i = 0; i < sentenceBoundaries.length - 1; i++) {
        if (charPos >= sentenceBoundaries[i] && charPos < sentenceBoundaries[i + 1]) {
          return isSentenceSelected(i);
        }
      }
      return false;
    };

    // Helper to check if a token index corresponds to a selected word
    const isTokenWordSelected = (tokenIndex: number) => {
      const wordIndex = wordToToken.indexOf(tokenIndex);
      if (wordIndex !== -1) {
        // It's a word - check if selected
        return isWordSelected(wordIndex);
      }
      
      // It's a separator - check if both adjacent words are selected
      let wordBefore = -1;
      let wordAfter = -1;
      
      for (let i = 0; i < wordToToken.length; i++) {
        if (wordToToken[i] < tokenIndex) wordBefore = i;
        if (wordToToken[i] > tokenIndex && wordAfter === -1) wordAfter = i;
      }
      
      // Highlight separator if both neighbors are selected
      if (wordBefore !== -1 && wordAfter !== -1) {
        return isWordSelected(wordBefore) && isWordSelected(wordAfter);
      }
      
      return false;
    };

    let charIndex = 0;
    const elements: any[] = [];

    tokens.forEach((token, tokenIndex) => {
      const tokenStart = charIndex;
      const tokenEnd = charIndex + token.length;
      const isSeparator = WORD_SEPARATORS.test(token);
      const wordIndex = wordToToken.indexOf(tokenIndex);

      const isUncommitted = !isSeparator && wordIndex === lastWordIndex && !isLastWordCommitted;
      const isWordSel = isTokenWordSelected(tokenIndex);

      // For separator tokens with sentence selection, render character-by-character
      // so each character can have its own selection state
      if (isSeparator && sentenceSelection) {
        for (let i = 0; i < token.length; i++) {
          const charPos = tokenStart + i;
          const char = token[i];
          const isCharSelected = isWordSel || isCharInSelectedSentence(charPos);
          const charClasses = isCharSelected ? "selected" : "";
          
          if (cursorPosition === charPos) {
            elements.push(
              <span key={`${tokenIndex}-${i}`} className={charClasses}>
                <span className="cursor"></span>
                {char}
              </span>
            );
          } else {
            elements.push(<span key={`${tokenIndex}-${i}`} className={charClasses}>{char}</span>);
          }
        }
      } else {
        const isSelected = isWordSel || isCharInSelectedSentence(tokenStart);
        const classes = [
          isSelected ? "selected" : "",
          isUncommitted ? "uncommitted" : "",
        ].filter(Boolean).join(' ');

        // Check if cursor is within this token
        if (cursorPosition >= tokenStart && cursorPosition < tokenEnd) {
          const cursorOffset = cursorPosition - tokenStart;
          const beforeCursor = token.slice(0, cursorOffset);
          const afterCursor = token.slice(cursorOffset);

          elements.push(
            <span key={tokenIndex} className={classes}>
              {beforeCursor}
              <span className="cursor"></span>
              {afterCursor}
            </span>
          );
        } else {
          elements.push(<span key={tokenIndex} className={classes}>{token}</span>);
        }
      }

      charIndex = tokenEnd;
    });

    // If cursor is at the very end (after all text)
    if (cursorPosition >= text.length) {
      elements.push(<span key="cursor-end" className="cursor"></span>);
    }

    return elements;
  };

  return (
    <div className="editor-container">
      <pre>{renderText(text)}</pre>
    </div>
  );
};

