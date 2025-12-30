import React from "react";

interface SuggestionBarProps {
  suggestions: string[];
  currentPrefix: string;
  onSelect: (word: string) => void;
}

export const SuggestionBar = ({ suggestions, currentPrefix, onSelect }: SuggestionBarProps) => {
  if (suggestions.length === 0) {
    return (
      <div className="suggestion-bar">
        <div className="suggestion-empty">
          {currentPrefix ? "No suggestions" : "Start typing..."}
        </div>
      </div>
    );
  }

  return (
    <div className="suggestion-bar">
      {suggestions.map((word, idx) => (
        <button
          key={`${idx}-${word}`}
          className="suggestion-item"
          onClick={() => onSelect(word)}
        >
          <span className="suggestion-key">{idx + 1}</span>
          <span className="suggestion-word">
            <span className="suggestion-prefix">{currentPrefix}</span>
            <span className="suggestion-completion">{word.slice(currentPrefix.length)}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

