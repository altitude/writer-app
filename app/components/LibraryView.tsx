import React, { useEffect, useState, useRef } from "react";
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
    updateDocumentTitle,
  } = useLibrary();

  const { subscribe } = useVirtualKeyboard();
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Renaming state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const documents = library.documents;

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean }) => {
      // When editing, only handle Enter and Escape
      if (editingId) {
        if (event.key === "Enter") {
          // Save the new title
          if (editingTitle.trim()) {
            updateDocumentTitle(editingId, editingTitle.trim());
          }
          setEditingId(null);
          return;
        }
        if (event.key === "Escape") {
          // Cancel editing
          setEditingId(null);
          return;
        }
        // Let other keys through to the input
        return;
      }

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

      // R to rename document
      if (event.key === "r" || event.key === "R") {
        const doc = documents[selectedIndex];
        if (doc) {
          setEditingId(doc.id);
          setEditingTitle(doc.title);
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
  }, [subscribe, documents, selectedIndex, createDocument, deleteDocument, openDocument, onOpenDocument, editingId, editingTitle, updateDocumentTitle]);

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
          {editingId ? '↵ save · Esc cancel' : '⇧⌘? help · R rename · N new · ↵ open'}
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
              const isEditing = editingId === doc.id;
              const isEmpty = isDocumentEmpty(doc);
              const wordCount = getWordCount(doc);
              
              return (
                <div
                  key={doc.id}
                  className={`library-item ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
                >
                  <div className="library-item-main">
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        className="library-item-title-input"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => {
                          if (editingTitle.trim()) {
                            updateDocumentTitle(editingId, editingTitle.trim());
                          }
                          setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="library-item-title">{doc.title}</span>
                    )}
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

