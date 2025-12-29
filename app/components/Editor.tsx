import React, { useEffect, useRef, useState } from "react";

interface EditorProps {
  initialText?: string;
  debug?: boolean;
}

const WORD_SEPARATORS = /^[ ,;.?!\n]+$/;

export const Editor = ({ initialText = "", debug = false }: EditorProps) => {
  const [text, setText] = useState(initialText);
  const textRef = useRef(text);
  textRef.current = text;

  const [cursorPosition, setCursorPosition] = useState(text.length);
  const cursorRef = useRef(cursorPosition);
  cursorRef.current = cursorPosition;

  const [wordSelection, setWordSelection] = useState(null as { start: number; end: number } | null);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.altKey && event.key === "ArrowRight") {
        // Extend selection to the right
        event.preventDefault();
        setWordSelection((prev) => {
          if (!prev) {
            const wordIdx = getWordIndexAtPosition(cursorRef.current, textRef.current);
            return { start: wordIdx, end: wordIdx };
          }
          return { ...prev, end: prev.end + 1 };
        });
      } else if (event.shiftKey && event.altKey && event.key === "ArrowLeft") {
        // Extend selection to the left
        event.preventDefault();
        setWordSelection((prev) => {
          if (!prev) {
            const wordIdx = getWordIndexAtPosition(cursorRef.current, textRef.current);
            return { start: wordIdx, end: wordIdx };
          }
          return { ...prev, end: prev.end - 1 };
        });
      } else if (event.altKey && event.key === "ArrowRight") {
        // Move single word selection right
        event.preventDefault();
        setWordSelection((prev) => {
          if (!prev) {
            const wordIdx = getWordIndexAtPosition(cursorRef.current, textRef.current);
            return { start: wordIdx, end: wordIdx };
          }
          const next = prev.end + 1;
          return { start: next, end: next };
        });
      } else if (event.altKey && event.key === "ArrowLeft") {
        // Move single word selection left
        event.preventDefault();
        setWordSelection((prev) => {
          if (!prev) {
            const wordIdx = getWordIndexAtPosition(cursorRef.current, textRef.current);
            return { start: wordIdx, end: wordIdx };
          }
          const next = prev.end - 1;
          return { start: next, end: next };
        });
      } else if (event.key === "ArrowRight") {
        setCursorPosition((prev) => Math.min(prev + 1, textRef.current.length));
      } else if (event.key === "ArrowLeft") {
        setCursorPosition((prev) => Math.max(prev - 1, 0));
      }

      if (event.key === "Escape") {
        setWordSelection(null);
      }

      if (event.key === "ArrowDown") {
        setWordSelection(null);
      }

      if (event.key === "Backspace") {
        if (cursorRef.current > 0) {
          const pos = cursorRef.current;
          setText((prev) => prev.slice(0, pos - 1) + prev.slice(pos));
          cursorRef.current = pos - 1;
          setCursorPosition(pos - 1);
        }
      } else if (event.key === "Enter") {
        const pos = cursorRef.current;
        setText((prev) => prev.slice(0, pos) + "\n" + prev.slice(pos));
        cursorRef.current = pos + 1;
        setCursorPosition(pos + 1);
      } else if (event.key.length === 1) {
        const pos = cursorRef.current;
        setText((prev) => prev.slice(0, pos) + event.key + prev.slice(pos));
        cursorRef.current = pos + 1;
        setCursorPosition(pos + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const isWordSelected = (index: number) => {
    if (!wordSelection) return false;
    const min = Math.min(wordSelection.start, wordSelection.end);
    const max = Math.max(wordSelection.start, wordSelection.end);
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

    // Helper to check if a token index corresponds to a selected word
    const isTokenSelected = (tokenIndex: number) => {
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
      const classes = [
        isTokenSelected(tokenIndex) ? "selected" : "",
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

      charIndex = tokenEnd;
    });

    // If cursor is at the very end (after all text)
    if (cursorPosition >= text.length) {
      elements.push(<span key="cursor-end" className="cursor"></span>);
    }

    return elements;
  };

  return (
    <>
      <div className="editor-container">
        <pre>{renderText(text)}</pre>
      </div>
      {debug && (
        <div className="debug-container">
          <pre>{JSON.stringify({
            cursorPosition,
            wordSelection,
          })}</pre>
        </div>
      )}
    </>
  );
};

