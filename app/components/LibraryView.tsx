import React, { useEffect, useState } from "react";
import { useLibrary, Document } from "./LibraryContext";
import { useVirtualKeyboard } from "./VirtualKeyboard";

interface LibraryViewProps {
  onOpenDocument: (id: string) => void;
}

export const LibraryView = ({ onOpenDocument }: LibraryViewProps) => {
  const {
    library,
    createDocument,
    deleteDocument,
    openDocument,
  } = useLibrary();

  const { subscribe } = useVirtualKeyboard();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const documents = library.documents;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean }) => {
      // Arrow up/down to navigate
      if (event.key === "ArrowUp") {
        setSelectedIndex(prev => Math.max(0, prev - 1));
        return;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex(prev => Math.min(documents.length - 1, prev + 1));
        return;
      }

      // Enter to open document
      if (event.key === "Enter") {
        const doc = documents[selectedIndex];
        if (doc) {
          openDocument(doc.id);
          onOpenDocument(doc.id);
        }
        return;
      }

      // N to create new document
      if (event.key === "n" || event.key === "N") {
        const newId = createDocument();
        onOpenDocument(newId);
        return;
      }

      // Backspace to delete (only if document is empty)
      if (event.key === "Backspace") {
        const doc = documents[selectedIndex];
        if (doc && isDocumentEmpty(doc)) {
          deleteDocument(doc.id);
          // Adjust selection if needed
          if (selectedIndex >= documents.length - 1 && selectedIndex > 0) {
            setSelectedIndex(prev => prev - 1);
          }
        }
        return;
      }
    };

    return subscribe(handleKeyDown);
  }, [subscribe, documents, selectedIndex, createDocument, deleteDocument, openDocument, onOpenDocument]);

  // Check if a document is empty (can be deleted without confirmation)
  const isDocumentEmpty = (doc: Document) => {
    if (doc.fragments.length === 0) return true;
    if (doc.fragments.length === 1 && doc.fragments[0].sentences.length === 0) return true;
    // Also consider empty if only has starter text
    if (doc.fragments.length === 1 && 
        doc.fragments[0].sentences.length === 1 &&
        doc.fragments[0].sentences[0].text === "A new story begins here.") {
      return true;
    }
    return false;
  };

  // Get preview text for a document
  const getPreview = (doc: Document) => {
    for (const fragId of doc.assembly) {
      const fragment = doc.fragments.find(f => f.id === fragId);
      if (fragment && fragment.sentences.length > 0) {
        const text = fragment.sentences[0].text;
        const preview = text.slice(0, 60);
        return preview + (text.length > 60 ? "…" : "");
      }
    }
    // Fallback to any fragment
    for (const fragment of doc.fragments) {
      if (fragment.sentences.length > 0) {
        const text = fragment.sentences[0].text;
        const preview = text.slice(0, 60);
        return preview + (text.length > 60 ? "…" : "");
      }
    }
    return "(empty)";
  };

  // Get word count for a document
  const getWordCount = (doc: Document) => {
    let count = 0;
    for (const fragment of doc.fragments) {
      for (const sentence of fragment.sentences) {
        count += sentence.text.split(/\s+/).filter(w => w.length > 0).length;
      }
    }
    return count;
  };

  // Format relative time
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="library-view">
      <div className="library-header">
        <span className="library-title">Library</span>
        <span className="library-shortcuts">
          ↑↓ nav · N new · ⌫ del · ↵ open
        </span>
      </div>

      <div className="library-content">
        {documents.length === 0 ? (
          <div className="library-empty">
            No documents yet.
            <br />
            <span className="library-hint">Press N to create one.</span>
          </div>
        ) : (
          <div className="library-list">
            {documents.map((doc, idx) => {
              const isSelected = selectedIndex === idx;
              const isEmpty = isDocumentEmpty(doc);
              const wordCount = getWordCount(doc);
              
              return (
                <div
                  key={doc.id}
                  className={`library-item ${isSelected ? 'selected' : ''}`}
                >
                  <div className="library-item-main">
                    <span className="library-item-title">{doc.title}</span>
                    <span className="library-item-meta">
                      {wordCount} words · {formatTime(doc.updatedAt)}
                      {isEmpty && ' · empty'}
                    </span>
                  </div>
                  <div className="library-item-preview">{getPreview(doc)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

