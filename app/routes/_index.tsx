import React, { useEffect, useRef, useState } from "react";

const LinkTag = ({href, image, text} : {href: string, image: string, text: string}) => {
  return (
    <div className="inline-block link-tag">
      <a href={href} target="_blank" className="flex items-center gap-2">
        <img src={image} alt={text} className="w-4 h-4" />
        <span>{text}</span>
      </a>
    </div>
  )
}

const introText = `This is a simple app to help you write your stories.\nYou can take it from here.`;

export default function Index() {
  const [text, setText] = useState(introText);
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log(event);

      if (event.shiftKey && event.altKey && event.key === "ArrowRight") {
        // Extend selection to the right
        event.preventDefault();
        setWordSelection((prev) => {
          if (!prev) return { start: 0, end: 0 };
          return { ...prev, end: prev.end + 1 };
        });
      } else if (event.shiftKey && event.altKey && event.key === "ArrowLeft") {
        // Extend selection to the left
        event.preventDefault();
        setWordSelection((prev) => {
          if (!prev) return { start: 0, end: 0 };
          return { ...prev, end: prev.end - 1 };
        });
      } else if (event.altKey && event.key === "ArrowRight") {
        // Move single word selection right
        event.preventDefault();
        setWordSelection((prev) => {
          const next = prev ? prev.end + 1 : 0;
          return { start: next, end: next };
        });
      } else if (event.altKey && event.key === "ArrowLeft") {
        // Move single word selection left
        event.preventDefault();
        setWordSelection((prev) => {
          const next = prev ? prev.end - 1 : 0;
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
        setText((prev) => prev.slice(0, -1));
      } else if (event.key === "Enter") {
        setText((prev) => prev + "\n");
      } else if (event.key.length === 1) {
        setText((prev) => prev + event.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const [wordSelection, setWordSelection] = useState(null as { start: number; end: number } | null);
  const [cursorPosition, setCursorPosition] = useState(text.length);

  const isWordSelected = (index: number) => {
    if (!wordSelection) return false;
    const min = Math.min(wordSelection.start, wordSelection.end);
    const max = Math.max(wordSelection.start, wordSelection.end);
    return index >= min && index <= max;
  };

  const WORD_SEPARATORS = /[ ,;.?!\n]/;

  const renderText = (text: string) => {
    // Split on separators but keep them in the result
    const words = text.split(/([ ,;.?!\n]+)/);
    const lastWordIndex = words.length - 1;
    const isLastWordCommitted = WORD_SEPARATORS.test(text.slice(-1));

    return words.map((w, index) => {
      const isUncommitted = index === lastWordIndex && !isLastWordCommitted;
      const classes = [
        isWordSelected(index) ? "selected" : "",
        isUncommitted ? "uncommitted" : "",
      ].filter(Boolean).join(' ');

      return <span key={index} className={classes}>{w}</span>
    });
  }

  return (
    <>
      <div className="root-container">
        <pre>{renderText(text)}</pre>
      </div>
      <div className="debug-container">
        <pre>{JSON.stringify({
          cursorPosition,
          wordSelection,
        })}</pre>
      </div>
    </>
  );
} 