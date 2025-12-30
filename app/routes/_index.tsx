import React, { useState, useEffect, useCallback } from "react";
import { LibraryProvider, useLibrary } from "../components/LibraryContext";
import { DocumentProvider } from "../components/DocumentContext";
import { FragmentEditor } from "../components/FragmentEditor";
import { LibraryView } from "../components/LibraryView";
import { HelpView } from "../components/HelpView";
import { useVirtualKeyboard } from "../components/VirtualKeyboard";

// Main app content that switches between library and editor
const AppContent = () => {
  const { library, currentDocument, closeDocument, openDocument } = useLibrary();
  const { subscribe } = useVirtualKeyboard();
  const [showLibrary, setShowLibrary] = useState(!currentDocument);
  const [showHelp, setShowHelp] = useState(false);

  // Handle global shortcuts
  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean; shiftKey?: boolean }) => {
      // Cmd+Shift+? to show help (unless already showing help)
      if (event.metaKey && event.shiftKey && event.key === "?" && !showHelp) {
        setShowHelp(true);
        return;
      }
      
      // Cmd+L to toggle library
      if (event.metaKey && event.key.toLowerCase() === "l") {
        setShowLibrary(prev => !prev);
        return;
      }
    };

    return subscribe(handleKeyDown);
  }, [subscribe, showHelp]);

  const handleOpenDocument = useCallback((id: string) => {
    openDocument(id);
    setShowLibrary(false);
  }, [openDocument]);

  const handleShowLibrary = useCallback(() => {
    setShowLibrary(true);
  }, []);

  const handleCloseHelp = useCallback(() => {
    setShowHelp(false);
  }, []);

  // Show help overlay if requested
  if (showHelp) {
    return <HelpView onClose={handleCloseHelp} />;
  }

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
