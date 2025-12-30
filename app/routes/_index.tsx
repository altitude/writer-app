import React, { useState, useEffect, useCallback } from "react";
import { LibraryProvider, useLibrary } from "../components/LibraryContext";
import { DocumentProvider } from "../components/DocumentContext";
import { FragmentEditor } from "../components/FragmentEditor";
import { LibraryView } from "../components/LibraryView";
import { useVirtualKeyboard } from "../components/VirtualKeyboard";

// Main app content that switches between library and editor
const AppContent = () => {
  const { library, currentDocument, closeDocument, openDocument } = useLibrary();
  const { subscribe } = useVirtualKeyboard();
  const [showLibrary, setShowLibrary] = useState(!currentDocument);

  // Handle Cmd+L to toggle library
  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean }) => {
      if (event.metaKey && event.key.toLowerCase() === "l") {
        setShowLibrary(prev => !prev);
        return;
      }
    };

    return subscribe(handleKeyDown);
  }, [subscribe]);

  const handleOpenDocument = useCallback((id: string) => {
    openDocument(id);
    setShowLibrary(false);
  }, [openDocument]);

  const handleShowLibrary = useCallback(() => {
    setShowLibrary(true);
  }, []);

  // Show library if no document is open or if explicitly requested
  if (showLibrary || !currentDocument) {
    return <LibraryView onOpenDocument={handleOpenDocument} />;
  }

  // Show document editor
  return (
    <DocumentProvider key={currentDocument.id}>
      <FragmentEditor onShowLibrary={handleShowLibrary} />
    </DocumentProvider>
  );
};

export default function Index() {
  // Wait for client mount to avoid hydration issues
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="root-container" />;
  }

  return (
    <div className="root-container">
      <LibraryProvider>
        <AppContent />
      </LibraryProvider>
    </div>
  );
}
