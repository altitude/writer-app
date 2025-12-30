import React, { useEffect, useState, useRef } from "react";
import { useVirtualKeyboard } from "./VirtualKeyboard";

interface WordEntry {
  word: string;
  definition: string;
  synonyms?: string[];
}

// Hardcoded dictionary for now - will be replaced with API later
const DICTIONARY: WordEntry[] = [
  { word: "ephemeral", definition: "lasting for a very short time", synonyms: ["fleeting", "transient", "brief"] },
  { word: "serendipity", definition: "the occurrence of events by chance in a happy way", synonyms: ["luck", "fortune", "chance"] },
  { word: "eloquent", definition: "fluent or persuasive in speaking or writing", synonyms: ["articulate", "expressive", "fluent"] },
  { word: "melancholy", definition: "a deep, persistent sadness", synonyms: ["sadness", "sorrow", "gloom"] },
  { word: "resilient", definition: "able to recover quickly from difficulties", synonyms: ["tough", "strong", "adaptable"] },
  { word: "ubiquitous", definition: "present, appearing, or found everywhere", synonyms: ["omnipresent", "pervasive", "universal"] },
  { word: "ethereal", definition: "extremely delicate and light; heavenly", synonyms: ["delicate", "airy", "celestial"] },
  { word: "luminous", definition: "full of or shedding light; bright", synonyms: ["bright", "radiant", "glowing"] },
  { word: "pensive", definition: "engaged in deep or serious thought", synonyms: ["thoughtful", "reflective", "contemplative"] },
  { word: "serene", definition: "calm, peaceful, and untroubled", synonyms: ["calm", "peaceful", "tranquil"] },
  { word: "whimsical", definition: "playfully quaint or fanciful", synonyms: ["playful", "fanciful", "quirky"] },
  { word: "vivid", definition: "producing powerful feelings or clear images", synonyms: ["bright", "intense", "striking"] },
  { word: "enigmatic", definition: "difficult to interpret or understand; mysterious", synonyms: ["mysterious", "puzzling", "cryptic"] },
  { word: "tenacious", definition: "holding firmly; persistent", synonyms: ["persistent", "determined", "stubborn"] },
  { word: "benevolent", definition: "well-meaning and kindly", synonyms: ["kind", "generous", "charitable"] },
  { word: "cacophony", definition: "a harsh, discordant mixture of sounds", synonyms: ["din", "racket", "noise"] },
  { word: "diligent", definition: "having or showing care in one's work", synonyms: ["hardworking", "industrious", "thorough"] },
  { word: "ebullient", definition: "cheerful and full of energy", synonyms: ["enthusiastic", "exuberant", "bubbly"] },
  { word: "fastidious", definition: "very attentive to detail; meticulous", synonyms: ["meticulous", "particular", "fussy"] },
  { word: "gregarious", definition: "fond of company; sociable", synonyms: ["sociable", "outgoing", "friendly"] },
  { word: "harrowing", definition: "extremely distressing; traumatic", synonyms: ["distressing", "traumatic", "painful"] },
  { word: "incandescent", definition: "emitting light as a result of being heated", synonyms: ["glowing", "bright", "brilliant"] },
  { word: "juxtapose", definition: "place close together for contrasting effect", synonyms: ["compare", "contrast", "set side by side"] },
  { word: "languid", definition: "weak or faint from illness or fatigue", synonyms: ["relaxed", "unhurried", "leisurely"] },
  { word: "mundane", definition: "lacking interest or excitement; dull", synonyms: ["ordinary", "everyday", "routine"] },
  { word: "nebulous", definition: "unclear, vague, or ill-defined", synonyms: ["vague", "unclear", "hazy"] },
  { word: "ostentatious", definition: "characterized by vulgar display; showy", synonyms: ["showy", "flashy", "pretentious"] },
  { word: "paradox", definition: "a seemingly contradictory statement that may be true", synonyms: ["contradiction", "anomaly", "puzzle"] },
  { word: "quintessential", definition: "representing the perfect example of something", synonyms: ["typical", "classic", "ideal"] },
  { word: "reverie", definition: "a state of being pleasantly lost in thought", synonyms: ["daydream", "trance", "musing"] },
];

interface DictionaryViewProps {
  onClose: () => void;
  onInsertWord: (word: string) => void;
}

export const DictionaryView = ({ onClose, onInsertWord }: DictionaryViewProps) => {
  const { subscribe } = useVirtualKeyboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter words based on search query
  const filteredWords = searchQuery.length === 0 
    ? DICTIONARY 
    : DICTIONARY.filter(entry => 
        entry.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.synonyms?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean }) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowUp") {
        setSelectedIndex(prev => Math.max(0, prev - 1));
        return;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex(prev => Math.min(filteredWords.length - 1, prev + 1));
        return;
      }

      if (event.key === "Enter" && filteredWords.length > 0) {
        const selected = filteredWords[selectedIndex];
        if (selected) {
          onInsertWord(selected.word);
          onClose();
        }
        return;
      }
    };

    return subscribe(handleKeyDown);
  }, [subscribe, onClose, onInsertWord, filteredWords, selectedIndex]);

  return (
    <div className="dictionary-view">
      <div className="dictionary-header">
        <span className="dictionary-title">Dictionary</span>
        <span className="dictionary-shortcuts">↑↓ nav · ↵ insert · Esc close</span>
      </div>

      <div className="dictionary-search">
        <input
          ref={inputRef}
          type="text"
          className="dictionary-input"
          placeholder="Search words..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="dictionary-content">
        {filteredWords.length === 0 ? (
          <div className="dictionary-empty">No words found</div>
        ) : (
          <div className="dictionary-list">
            {filteredWords.map((entry, idx) => (
              <div
                key={entry.word}
                className={`dictionary-item ${selectedIndex === idx ? 'selected' : ''}`}
              >
                <div className="dictionary-word">{entry.word}</div>
                <div className="dictionary-definition">{entry.definition}</div>
                {entry.synonyms && entry.synonyms.length > 0 && (
                  <div className="dictionary-synonyms">
                    syn: {entry.synonyms.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

