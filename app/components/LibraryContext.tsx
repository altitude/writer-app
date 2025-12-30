import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Fragment, Document, Library } from "./types";

export type { Fragment, Document, Library };

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

const createEmptyFragment = (): Fragment => ({
  id: generateFragmentId(),
  sentences: [],
});

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

interface LibraryProviderProps {
  initialDocuments?: Document[];
  children?: React.ReactNode;
}

export const LibraryProvider = ({ 
  initialDocuments = [],
  children 
}: LibraryProviderProps) => {
  const [library, setLibrary] = useState<Library>(() => {
    // If no initial documents, create one to start with
    if (initialDocuments.length === 0) {
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
    }
    
    return {
      documents: initialDocuments,
      currentDocumentId: initialDocuments[0]?.id ?? null,
    };
  });

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

