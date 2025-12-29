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

      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedWord((prev) => prev + 1);
      } else if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedWord((prev) => prev - 1);
      } else if (event.key === "ArrowRight") {
        setCursorPosition((prev) => Math.min(prev + 1, textRef.current.length));
      } else if (event.key === "ArrowLeft") {
        setCursorPosition((prev) => Math.max(prev - 1, 0));
      }

      if (event.key === "Escape") {
        setSelectedWord(-1);
      }

      if (event.key === "ArrowDown") {
        setSelectedWord(-1);
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

  const [selectedWord, setSelectedWord] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(text.length);

  const renderText = (text: string) => {
    return text.split(' ').map((w, index) => {
      return <span key={index} className={selectedWord === index ? "selected" : ""}>{w} </span>
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
          selectedWord,
        })}</pre>
      </div>
    </>
  );
} 