import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLibrary } from "./LibraryContext";
import { Fragment, SentenceInput } from "./types";

export type { Fragment, SentenceInput };

// The document state (fragments and assembly)
export interface DocumentState {
  fragments: Fragment[];
  assembly: string[]; // Ordered fragment IDs (placed fragments)
}

interface DocumentContextValue {
  document: DocumentState;
  currentFragmentIndex: number;
  currentFragment: Fragment | null;
  
  // Navigation
  setCurrentFragmentIndex: (index: number) => void;
  goToPreviousFragment: () => void;
  goToNextFragment: () => void;
  
  // Fragment operations
  createFragment: () => void;
  updateFragment: (id: string, sentences: SentenceInput[]) => void;
  deleteFragment: (id: string) => void;
  
  // Assembly operations
  placeFragment: (id: string, position?: number) => void;
  unplaceFragment: (id: string) => void;
  reorderAssembly: (fromIndex: number, toIndex: number) => void;
}

const DocumentContext = createContext<DocumentContextValue | null>(null);

// Generate unique IDs
let fragmentIdCounter = 0;
const generateId = () => `fragment-${Date.now()}-${++fragmentIdCounter}`;

interface DocumentProviderProps {
  children?: React.ReactNode;
}

export const DocumentProvider = ({ children }: DocumentProviderProps) => {
  const { currentDocument, updateCurrentDocumentContent } = useLibrary();
  
  // Initialize from library's current document
  const [document, setDocument] = useState<DocumentState>(() => {
    if (currentDocument) {
      return {
        fragments: currentDocument.fragments,
        assembly: currentDocument.assembly,
      };
    }
    // Fallback (shouldn't happen if library is set up correctly)
    const emptyFragment = { id: generateId(), sentences: [] };
    return {
      fragments: [emptyFragment],
      assembly: [emptyFragment.id],
    };
  });
  
  const [currentFragmentIndex, setCurrentFragmentIndex] = useState(0);
  
  // Sync changes back to library (debounced via ref to avoid infinite loops)
  const syncTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = window.setTimeout(() => {
      updateCurrentDocumentContent(document.fragments, document.assembly);
    }, 100);
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [document, updateCurrentDocumentContent]);

  const currentFragment = useMemo(() => 
    document.fragments[currentFragmentIndex] ?? null,
    [document.fragments, currentFragmentIndex]
  );

  const goToPreviousFragment = useCallback(() => {
    setCurrentFragmentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNextFragment = useCallback(() => {
    setCurrentFragmentIndex(prev => 
      Math.min(document.fragments.length - 1, prev + 1)
    );
  }, [document.fragments.length]);

  const createFragment = useCallback(() => {
    const newFragment: Fragment = {
      id: generateId(),
      sentences: [],
    };
    setDocument(prev => ({
      ...prev,
      fragments: [...prev.fragments, newFragment],
    }));
    // Navigate to the new fragment
    setCurrentFragmentIndex(document.fragments.length);
  }, [document.fragments.length]);

  const updateFragment = useCallback((id: string, sentences: SentenceInput[]) => {
    setDocument(prev => ({
      ...prev,
      fragments: prev.fragments.map(f => 
        f.id === id ? { ...f, sentences } : f
      ),
    }));
  }, []);

  const deleteFragment = useCallback((id: string) => {
    setDocument(prev => {
      const newFragments = prev.fragments.filter(f => f.id !== id);
      // Keep at least one fragment
      if (newFragments.length === 0) {
        newFragments.push({ id: generateId(), sentences: [] });
      }
      return {
        fragments: newFragments,
        assembly: prev.assembly.filter(fid => fid !== id),
      };
    });
    // Adjust current index if needed
    setCurrentFragmentIndex(prev => 
      Math.min(prev, document.fragments.length - 2)
    );
  }, [document.fragments.length]);

  const placeFragment = useCallback((id: string, position?: number) => {
    setDocument(prev => {
      // Remove if already placed
      const newAssembly = prev.assembly.filter(fid => fid !== id);
      // Add at position or end
      if (position !== undefined) {
        newAssembly.splice(position, 0, id);
      } else {
        newAssembly.push(id);
      }
      return { ...prev, assembly: newAssembly };
    });
  }, []);

  const unplaceFragment = useCallback((id: string) => {
    setDocument(prev => ({
      ...prev,
      assembly: prev.assembly.filter(fid => fid !== id),
    }));
  }, []);

  const reorderAssembly = useCallback((fromIndex: number, toIndex: number) => {
    setDocument(prev => {
      const newAssembly = [...prev.assembly];
      const [moved] = newAssembly.splice(fromIndex, 1);
      newAssembly.splice(toIndex, 0, moved);
      return { ...prev, assembly: newAssembly };
    });
  }, []);

  const value = useMemo(() => ({
    document,
    currentFragmentIndex,
    currentFragment,
    setCurrentFragmentIndex,
    goToPreviousFragment,
    goToNextFragment,
    createFragment,
    updateFragment,
    deleteFragment,
    placeFragment,
    unplaceFragment,
    reorderAssembly,
  }), [
    document,
    currentFragmentIndex,
    currentFragment,
    goToPreviousFragment,
    goToNextFragment,
    createFragment,
    updateFragment,
    deleteFragment,
    placeFragment,
    unplaceFragment,
    reorderAssembly,
  ]);

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocument must be used within DocumentProvider");
  }
  return context;
};

