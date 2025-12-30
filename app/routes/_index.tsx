import React, { useMemo } from "react";
import { Editor } from "../components/Editor";

const starterTexts = [
  // Stanley Parable-esque
  [
    { text: "Once upon a time (which is to say, right now), a writer sat down with nothing but an idea and a blinking cursor.", committed: true },
    { text: "That writer is you.", committed: false },
    { text: "The rest is unwritten.", committed: true },
    { text: "\n\nOr is it?", committed: false },
  ],
  // Classic fairy tale
  [
    { text: "In a kingdom beyond the margins of the page, where ink flows like rivers and words grow like wildflowers, there lived a storyteller.", committed: true },
    { text: "They had a tale to tell.", committed: false },
    { text: "And its tale that had never been told before.", committed: true },
    { text: "\n\nAnd so it begins.", committed: false },
  ],
];

export default function Index() {
  const initialContent = useMemo(
    () => starterTexts[Math.floor(Math.random() * starterTexts.length)],
    []
  );

  return (
    <div className="root-container">
      <Editor initialContent={initialContent} />
    </div>
  );
}
