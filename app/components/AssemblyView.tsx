import React, { useEffect, useState } from "react";
import { useDocument, Fragment } from "./DocumentContext";
import { useVirtualKeyboard } from "./VirtualKeyboard";

interface AssemblyViewProps {
  onClose: () => void;
  onSelectFragment: (index: number) => void;
}

export const AssemblyView = ({ onClose, onSelectFragment }: AssemblyViewProps) => {
  const {
    document,
    currentFragmentIndex,
    placeFragment,
    unplaceFragment,
    reorderAssembly,
    setCurrentFragmentIndex,
  } = useDocument();

  const { subscribe } = useVirtualKeyboard();

  // Build lists of placed and unplaced fragments
  const placedFragments = document.assembly
    .map(id => document.fragments.find(f => f.id === id))
    .filter((f): f is Fragment => f !== undefined);
  
  const unplacedFragments = document.fragments.filter(
    f => !document.assembly.includes(f.id)
  );
  
  // Track selected item - start at the fragment being edited
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const currentId = document.fragments[currentFragmentIndex]?.id;
    if (!currentId) return 0;
    
    // Check if current fragment is in placed list
    const placedIndex = placedFragments.findIndex(f => f.id === currentId);
    if (placedIndex >= 0) return placedIndex;
    
    // Otherwise find in unplaced list
    const unplacedIndex = unplacedFragments.findIndex(f => f.id === currentId);
    if (unplacedIndex >= 0) return placedFragments.length + unplacedIndex;
    
    return 0;
  });

  const totalItems = placedFragments.length + unplacedFragments.length;
  const isInPlacedSection = selectedIndex < placedFragments.length;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: { key: string; metaKey?: boolean; shiftKey?: boolean }) => {
      // Escape or Cmd+A to close
      if (event.key === "Escape" || (event.metaKey && event.key === "a")) {
        onClose();
        return;
      }

      // Arrow up/down to navigate
      if (event.key === "ArrowUp") {
        if (event.metaKey && isInPlacedSection && selectedIndex > 0) {
          // Cmd+Up: Move fragment up in assembly
          reorderAssembly(selectedIndex, selectedIndex - 1);
          setSelectedIndex(prev => prev - 1);
        } else {
          setSelectedIndex(prev => Math.max(0, prev - 1));
        }
        return;
      }

      if (event.key === "ArrowDown") {
        if (event.metaKey && isInPlacedSection && selectedIndex < placedFragments.length - 1) {
          // Cmd+Down: Move fragment down in assembly
          reorderAssembly(selectedIndex, selectedIndex + 1);
          setSelectedIndex(prev => prev + 1);
        } else {
          setSelectedIndex(prev => Math.min(totalItems - 1, prev + 1));
        }
        return;
      }

      // Enter to jump into fragment
      if (event.key === "Enter") {
        const fragment = isInPlacedSection
          ? placedFragments[selectedIndex]
          : unplacedFragments[selectedIndex - placedFragments.length];
        
        if (fragment) {
          const fragmentIndex = document.fragments.findIndex(f => f.id === fragment.id);
          if (fragmentIndex >= 0) {
            setCurrentFragmentIndex(fragmentIndex);
            onSelectFragment(fragmentIndex);
            onClose();
          }
        }
        return;
      }

      // P to place/unplace
      if (event.key === "p" || event.key === "P") {
        if (isInPlacedSection) {
          // Unplace the fragment
          const fragment = placedFragments[selectedIndex];
          if (fragment) {
            unplaceFragment(fragment.id);
            // Adjust selection if needed
            if (selectedIndex >= placedFragments.length - 1 && selectedIndex > 0) {
              setSelectedIndex(prev => prev - 1);
            }
          }
        } else {
          // Place the fragment
          const fragment = unplacedFragments[selectedIndex - placedFragments.length];
          if (fragment) {
            placeFragment(fragment.id);
          }
        }
        return;
      }
    };

    return subscribe(handleKeyDown);
  }, [
    subscribe,
    onClose,
    onSelectFragment,
    selectedIndex,
    isInPlacedSection,
    placedFragments,
    unplacedFragments,
    totalItems,
    document.fragments,
    reorderAssembly,
    placeFragment,
    unplaceFragment,
    setCurrentFragmentIndex,
  ]);

  // Get first line preview of a fragment
  const getPreview = (fragment: Fragment) => {
    if (fragment.sentences.length === 0) return "(empty)";
    const firstSentence = fragment.sentences[0].text;
    const preview = firstSentence.slice(0, 50);
    return preview + (firstSentence.length > 50 ? "…" : "");
  };

  // Get commit progress for a fragment
  const getCommitProgress = (fragment: Fragment) => {
    if (fragment.sentences.length === 0) return 0;
    const committed = fragment.sentences.filter(s => s.committed).length;
    return Math.round((committed / fragment.sentences.length) * 100);
  };

  return (
    <div className="assembly-view">
      <div className="assembly-header">
        <span className="assembly-title">Assembly</span>
        <span className="assembly-shortcuts">
          ↑↓ navigate · ⌘↑↓ reorder · P place/unplace · ↵ open · Esc close
        </span>
      </div>

      <div className="assembly-content">
        {/* Placed fragments */}
        <div className="assembly-section">
          <div className="assembly-section-title">Placed ({placedFragments.length})</div>
          {placedFragments.length === 0 ? (
            <div className="assembly-empty">No fragments placed yet</div>
          ) : (
            placedFragments.map((fragment, idx) => {
              const isSelected = selectedIndex === idx;
              const isCurrent = document.fragments.findIndex(f => f.id === fragment.id) === currentFragmentIndex;
              const progress = getCommitProgress(fragment);
              
              return (
                <div
                  key={fragment.id}
                  className={`assembly-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  <span className="assembly-item-index">{idx + 1}.</span>
                  <span className="assembly-item-progress" title={`${progress}% committed`}>
                    {progress === 100 ? '✓' : progress === 0 ? '○' : '◐'}
                  </span>
                  <span className="assembly-item-preview">{getPreview(fragment)}</span>
                  <span className="assembly-item-count">{fragment.sentences.length}s</span>
                </div>
              );
            })
          )}
        </div>

        {/* Unplaced fragments */}
        {unplacedFragments.length > 0 && (
          <div className="assembly-section assembly-unplaced">
            <div className="assembly-section-title">Unplaced ({unplacedFragments.length})</div>
            {unplacedFragments.map((fragment, idx) => {
              const actualIdx = placedFragments.length + idx;
              const isSelected = selectedIndex === actualIdx;
              const isCurrent = document.fragments.findIndex(f => f.id === fragment.id) === currentFragmentIndex;
              const progress = getCommitProgress(fragment);
              
              return (
                <div
                  key={fragment.id}
                  className={`assembly-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  <span className="assembly-item-index">•</span>
                  <span className="assembly-item-progress" title={`${progress}% committed`}>
                    {progress === 100 ? '✓' : progress === 0 ? '○' : '◐'}
                  </span>
                  <span className="assembly-item-preview">{getPreview(fragment)}</span>
                  <span className="assembly-item-count">{fragment.sentences.length}s</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

