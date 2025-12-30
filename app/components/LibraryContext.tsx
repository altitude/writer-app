import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Fragment, Document, Library } from "./types";

export type { Fragment, Document, Library };

// localStorage key for persistence
const STORAGE_KEY = 'writer-app-library';
const SAVE_DEBOUNCE_MS = 500;

interface LibraryContextValue {
  library: Library;
  currentDocument: Document | null;
  
  // Document operations
  createDocument: (title?: string) => string; // Returns new doc ID
  deleteDocument: (id: string) => void;
  openDocument: (id: string) => void;
  closeDocument: () => void;
  updateDocumentTitle: (id: string, title: string) => void;
  
  // Update current document's content (called by DocumentContext)
  updateCurrentDocumentContent: (fragments: Fragment[], assembly: string[]) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

// Generate unique IDs
let documentIdCounter = 0;
const generateDocumentId = () => `doc-${Date.now()}-${++documentIdCounter}`;

// Create a default empty fragment for new documents
let fragmentIdCounter = 0;
const generateFragmentId = () => `fragment-${Date.now()}-${++fragmentIdCounter}`;

// Create starter content for new documents
const createStarterContent = (): { fragments: Fragment[], assembly: string[] } => {
  const fragment: Fragment = {
    id: generateFragmentId(),
    sentences: [
      { text: "A new story begins here.", committed: false },
    ],
  };
  return {
    fragments: [fragment],
    assembly: [fragment.id],
  };
};

// Load library from localStorage (SSR-safe)
const loadFromStorage = (): Library | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const parsed = JSON.parse(saved) as Library;
    
    // Basic validation
    if (!parsed.documents || !Array.isArray(parsed.documents)) {
      console.warn('Invalid library data in localStorage, starting fresh');
      return null;
    }
    
    return parsed;
  } catch (e) {
    console.warn('Failed to load library from localStorage:', e);
    return null;
  }
};

// Save library to localStorage
const saveToStorage = (library: Library) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch (e) {
    console.warn('Failed to save library to localStorage:', e);
  }
};

// Create default library for first-time users
const createDefaultLibrary = (): Library => {
  const { fragments, assembly } = createStarterContent();
  const starterDoc: Document = {
    id: generateDocumentId(),
    title: "Untitled",
    fragments,
    assembly,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return {
    documents: [starterDoc],
    currentDocumentId: starterDoc.id,
  };
};

interface LibraryProviderProps {
  children?: React.ReactNode;
}

export const LibraryProvider = ({ children }: LibraryProviderProps) => {
  // Initialize from localStorage or create default
  const [library, setLibrary] = useState<Library>(() => {
    const saved = loadFromStorage();
    if (saved && saved.documents.length > 0) {
      return saved;
    }
    return createDefaultLibrary();
  });
  
  // Track if this is the first render (skip saving on mount)
  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef<number | null>(null);

  // Save to localStorage on changes (debounced)
  useEffect(() => {
    // Skip saving on first render (we just loaded)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Debounce saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      saveToStorage(library);
    }, SAVE_DEBOUNCE_MS);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [library]);

  const currentDocument = useMemo(() => 
    library.documents.find(d => d.id === library.currentDocumentId) ?? null,
    [library.documents, library.currentDocumentId]
  );

  const createDocument = useCallback((title?: string) => {
    const { fragments, assembly } = createStarterContent();
    const newDoc: Document = {
      id: generateDocumentId(),
      title: title ?? "Untitled",
      fragments,
      assembly,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setLibrary(prev => ({
      documents: [...prev.documents, newDoc],
      currentDocumentId: newDoc.id,
    }));
    
    return newDoc.id;
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setLibrary(prev => {
      const newDocs = prev.documents.filter(d => d.id !== id);
      
      // If we deleted the current document, select another one
      let newCurrentId = prev.currentDocumentId;
      if (prev.currentDocumentId === id) {
        newCurrentId = newDocs.length > 0 ? newDocs[0].id : null;
      }
      
      return {
        documents: newDocs,
        currentDocumentId: newCurrentId,
      };
    });
  }, []);

  const openDocument = useCallback((id: string) => {
    setLibrary(prev => ({
      ...prev,
      currentDocumentId: id,
    }));
  }, []);

  const closeDocument = useCallback(() => {
    setLibrary(prev => ({
      ...prev,
      currentDocumentId: null,
    }));
  }, []);

  const updateDocumentTitle = useCallback((id: string, title: string) => {
    setLibrary(prev => ({
      ...prev,
      documents: prev.documents.map(d => 
        d.id === id 
          ? { ...d, title, updatedAt: Date.now() }
          : d
      ),
    }));
  }, []);

  const updateCurrentDocumentContent = useCallback((fragments: Fragment[], assembly: string[]) => {
    setLibrary(prev => {
      if (!prev.currentDocumentId) return prev;
      
      return {
        ...prev,
        documents: prev.documents.map(d => 
          d.id === prev.currentDocumentId
            ? { ...d, fragments, assembly, updatedAt: Date.now() }
            : d
        ),
      };
    });
  }, []);

  const value = useMemo(() => ({
    library,
    currentDocument,
    createDocument,
    deleteDocument,
    openDocument,
    closeDocument,
    updateDocumentTitle,
    updateCurrentDocumentContent,
  }), [
    library,
    currentDocument,
    createDocument,
    deleteDocument,
    openDocument,
    closeDocument,
    updateDocumentTitle,
    updateCurrentDocumentContent,
  ]);

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibrary must be used within LibraryProvider");
  }
  return context;
};

