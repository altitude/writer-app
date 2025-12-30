import React, { useCallback, useEffect, useState } from "react";
import { Editor, SentenceInput } from "./Editor";
import { useDocument } from "./DocumentContext";
import { useVirtualKeyboard } from "./VirtualKeyboard";
import { AssemblyView } from "./AssemblyView";
import { PreviewView } from "./PreviewView";

type ViewMode = 'editor' | 'assembly' | 'preview';

interface FragmentEditorProps {
  onShowLibrary?: () => void;
}

export const FragmentEditor = ({ onShowLibrary }: FragmentEditorProps) => {
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
  const [viewMode, setViewMode] = useState<ViewMode>('editor');

  // Handle fragment navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean; shiftKey?: boolean; ctrlKey?: boolean }) => {
      // Cmd+A — Toggle assembly view
      if (event.metaKey && event.key === "a") {
        setViewMode(prev => prev === 'assembly' ? 'editor' : 'assembly');
        return;
      }
      
      // Cmd+P — Toggle preview view
      if (event.metaKey && event.key.toLowerCase() === "p") {
        setViewMode(prev => prev === 'preview' ? 'editor' : 'preview');
        return;
      }
      
      // Don't handle other shortcuts when not in editor mode
      if (viewMode !== 'editor') return;
      
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
  }, [subscribe, goToPreviousFragment, goToNextFragment, createFragment, viewMode]);

  const handleContentChange = useCallback((sentences: SentenceInput[]) => {
    if (currentFragment) {
      updateFragment(currentFragment.id, sentences);
    }
  }, [currentFragment, updateFragment]);

  const handleCloseToEditor = useCallback(() => {
    setViewMode('editor');
  }, []);

  const handleSelectFragment = useCallback((index: number) => {
    setCurrentFragmentIndex(index);
  }, [setCurrentFragmentIndex]);

  const handleShowPreview = useCallback(() => {
    setViewMode('preview');
  }, []);

  if (viewMode === 'preview') {
    return <PreviewView onClose={handleCloseToEditor} />;
  }

  if (viewMode === 'assembly') {
    return (
      <AssemblyView 
        onClose={handleCloseToEditor}
        onSelectFragment={handleSelectFragment}
        onShowPreview={handleShowPreview}
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
          ⌘L library · ⌘J prev · ⌘K next · ^N new · ⌘A assembly · ⌘P preview
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

