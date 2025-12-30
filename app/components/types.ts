// Shared types for the document system

// A sentence input with text and commit state
export interface SentenceInput {
  text: string;
  committed: boolean;
  separator?: string; // Whitespace/newlines after this sentence (default: ' ')
}

// A fragment is a collection of sentences
export interface Fragment {
  id: string;
  sentences: SentenceInput[];
}

// A document is a complete story/piece with fragments
export interface Document {
  id: string;
  title: string;
  fragments: Fragment[];
  assembly: string[]; // Ordered fragment IDs for final output
  createdAt: number;
  updatedAt: number;
}

// The library holds all documents
export interface Library {
  documents: Document[];
  currentDocumentId: string | null;
}

