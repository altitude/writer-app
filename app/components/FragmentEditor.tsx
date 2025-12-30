import React, { useCallback, useEffect, useState } from "react";
import { Editor, SentenceInput } from "./Editor";
import { useDocument } from "./DocumentContext";
import { useVirtualKeyboard } from "./VirtualKeyboard";
import { AssemblyView } from "./AssemblyView";

export const FragmentEditor = () => {
  const { 
    document,
    currentFragmentIndex, 
    currentFragment,
    goToPreviousFragment,
    goToNextFragment,
    createFragment,
    updateFragment,
    setCurrentFragmentIndex,
  } = useDocument();
  
  const { subscribe } = useVirtualKeyboard();
  const [showAssembly, setShowAssembly] = useState(false);

  // Handle fragment navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean; shiftKey?: boolean }) => {
      // Cmd+A — Toggle assembly view
      if (event.metaKey && event.key === "a") {
        setShowAssembly(prev => !prev);
        return;
      }
      
      // Don't handle other shortcuts when assembly is open
      if (showAssembly) return;
      
      // Cmd+J — Previous fragment
      if (event.metaKey && event.key.toLowerCase() === "j") {
        goToPreviousFragment();
        return;
      }
      
      // Cmd+K — Next fragment
      if (event.metaKey && event.key.toLowerCase() === "k") {
        goToNextFragment();
        return;
      }
      
      // Ctrl+N — New fragment
      if (event.ctrlKey && event.key.toLowerCase() === "n") {
        createFragment();
        return;
      }
    };

    return subscribe(handleKeyDown);
  }, [subscribe, goToPreviousFragment, goToNextFragment, createFragment, showAssembly]);

  const handleContentChange = useCallback((sentences: SentenceInput[]) => {
    if (currentFragment) {
      updateFragment(currentFragment.id, sentences);
    }
  }, [currentFragment, updateFragment]);

  const handleCloseAssembly = useCallback(() => {
    setShowAssembly(false);
  }, []);

  const handleSelectFragment = useCallback((index: number) => {
    setCurrentFragmentIndex(index);
  }, [setCurrentFragmentIndex]);

  if (showAssembly) {
    return (
      <AssemblyView 
        onClose={handleCloseAssembly}
        onSelectFragment={handleSelectFragment}
      />
    );
  }

  if (!currentFragment) {
    return <div className="editor-container">No fragment selected</div>;
  }

  return (
    <div className="fragment-editor">
      <div className="fragment-header">
        <span className="fragment-indicator">
          Fragment {currentFragmentIndex + 1} of {document.fragments.length}
        </span>
        <span className="fragment-shortcuts">
          ⌘J prev · ⌘K next · ^N new · ⌘A assembly
        </span>
      </div>
      <Editor
        key={currentFragment.id}
        initialContent={currentFragment.sentences}
        onContentChange={handleContentChange}
        fragmentId={currentFragment.id}
      />
    </div>
  );
};

