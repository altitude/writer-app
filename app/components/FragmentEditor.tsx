import React, { useCallback, useEffect, useState, useRef } from "react";
import { Editor, SentenceInput } from "./Editor";
import { useDocument } from "./DocumentContext";
import { useVirtualKeyboard } from "./VirtualKeyboard";
import { AssemblyView } from "./AssemblyView";
import { PreviewView } from "./PreviewView";
import { DictionaryView } from "./DictionaryView";
import { ExportView } from "./ExportView";

type ViewMode = 'editor' | 'assembly' | 'preview' | 'dictionary' | 'export';

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
  const [wordToInsert, setWordToInsert] = useState<string | null>(null);

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
      
      // Cmd+D — Toggle dictionary view
      if (event.metaKey && event.key.toLowerCase() === "d") {
        setViewMode(prev => prev === 'dictionary' ? 'editor' : 'dictionary');
        return;
      }
      
      // Cmd+E — Toggle export view
      if (event.metaKey && event.key.toLowerCase() === "e") {
        setViewMode(prev => prev === 'export' ? 'editor' : 'export');
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

  const handleInsertWord = useCallback((word: string) => {
    setWordToInsert(word);
    setViewMode('editor');
  }, []);

  const handleWordInserted = useCallback(() => {
    setWordToInsert(null);
  }, []);

  if (viewMode === 'dictionary') {
    return (
      <DictionaryView 
        onClose={handleCloseToEditor}
        onInsertWord={handleInsertWord}
      />
    );
  }

  if (viewMode === 'export') {
    return <ExportView onClose={handleCloseToEditor} />;
  }

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
          ⇧⌘? help · ⌘E export · ⌘A assembly · ⌘P preview
        </span>
      </div>
      <Editor
        key={currentFragment.id}
        initialContent={currentFragment.sentences}
        onContentChange={handleContentChange}
        fragmentId={currentFragment.id}
        insertWord={wordToInsert}
        onWordInserted={handleWordInserted}
      />
    </div>
  );
};

