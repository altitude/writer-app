import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

export interface VirtualKeyEvent {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

type KeyHandler = (event: VirtualKeyEvent) => void;

interface VirtualKeyboardContextValue {
  subscribe: (handler: KeyHandler) => () => void;
  emit: (event: VirtualKeyEvent) => void;
}

const VirtualKeyboardContext = createContext<VirtualKeyboardContextValue | null>(null);

export const VirtualKeyboardProvider = ({ children }: { children: React.ReactNode }) => {
  const handlersRef = useRef<Set<KeyHandler>>(new Set());

  const subscribe = useCallback((handler: KeyHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const emit = useCallback((event: VirtualKeyEvent) => {
    handlersRef.current.forEach((handler) => handler(event));
  }, []);

  const value = useMemo(() => ({ subscribe, emit }), [subscribe, emit]);

  return (
    <VirtualKeyboardContext.Provider value={value}>
      {children}
    </VirtualKeyboardContext.Provider>
  );
};

export const useVirtualKeyboard = () => {
  const context = useContext(VirtualKeyboardContext);
  if (!context) {
    throw new Error("useVirtualKeyboard must be used within VirtualKeyboardProvider");
  }
  return context;
};

// Keys that the editor handles and should prevent default browser behavior
const HANDLED_KEYS = new Set([
  "ArrowRight",
  "ArrowLeft",
  "ArrowUp",
  "ArrowDown",
  "Backspace",
  "Enter",
  "Escape",
  "Tab",
]);

const shouldPreventDefault = (e: KeyboardEvent): boolean => {
  // Don't prevent default if user is typing in an input or textarea
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    // Only prevent our app shortcuts, not regular typing
    if (e.metaKey && ["j", "k", "a", "p", "l"].includes(e.key.toLowerCase())) return true;
    return false;
  }
  
  // Always prevent for our navigation/editing keys
  if (HANDLED_KEYS.has(e.key)) return true;
  // Prevent for Ctrl+A/E (line navigation)
  if (e.ctrlKey && (e.key === "a" || e.key === "e")) return true;
  // Prevent for fragment navigation: Cmd+J, Cmd+K, Ctrl+N, Cmd+A (assembly), Cmd+P (preview), Cmd+L (library), Cmd+D (dictionary), Cmd+/ (help)
  if (e.metaKey && ["j", "k", "a", "p", "l", "d", "/"].includes(e.key.toLowerCase())) return true;
  if (e.ctrlKey && e.key.toLowerCase() === "n") return true;
  // Allow Cmd+C, Cmd+V, Cmd+X, Cmd+Z (system clipboard/undo)
  if (e.metaKey && ["c", "v", "x", "z"].includes(e.key.toLowerCase())) return false;
  // Prevent single character keys (typing)
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) return true;
  return false;
};

export const KeyboardBridge = () => {
  const { emit } = useVirtualKeyboard();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldPreventDefault(e)) {
        e.preventDefault();
      }

      emit({
        key: e.key,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
      });
    };

    // Use capture phase to intercept browser shortcuts like Cmd+N before browser handles them
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [emit]);

  return null;
};

