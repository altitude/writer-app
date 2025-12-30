import React, { useState, useEffect } from "react";
import { DocumentProvider, Fragment } from "../components/DocumentContext";
import { FragmentEditor } from "../components/FragmentEditor";

const starterFragments: Fragment[][] = [
  // Stanley Parable-esque
  [
    {
      id: "intro-1",
      sentences: [
        { text: "Once upon a time (which is to say, right now), a writer sat down with nothing but an idea and a blinking cursor.", committed: true },
        { text: "That writer is you.", committed: false },
        { text: "The rest is unwritten.", committed: true },
      ],
    },
    {
      id: "outro-1",
      sentences: [
        { text: "Or is it?", committed: false },
      ],
    },
  ],
  // Classic fairy tale
  [
    {
      id: "intro-2",
      sentences: [
        { text: "In a kingdom beyond the margins of the page, where ink flows like rivers and words grow like wildflowers, there lived a storyteller.", committed: true },
        { text: "They had a tale to tell.", committed: false },
      ],
    },
    {
      id: "middle-2",
      sentences: [
        { text: "And its tale that had never been told before.", committed: true },
      ],
    },
    {
      id: "outro-2",
      sentences: [
        { text: "And so it begins.", committed: false },
      ],
    },
  ],
];

export default function Index() {
  // Pick randomly only on client to avoid hydration mismatch
  const [initialFragments, setInitialFragments] = useState<Fragment[] | null>(null);

  useEffect(() => {
    // Pick random starter on client mount only
    setInitialFragments(starterFragments[Math.floor(Math.random() * starterFragments.length)]);
  }, []);

  // Don't render until client has picked a random starter
  if (!initialFragments) {
    return <div className="root-container" />;
  }

  return (
    <div className="root-container">
      <DocumentProvider initialFragments={initialFragments}>
        <FragmentEditor />
      </DocumentProvider>
    </div>
  );
}
