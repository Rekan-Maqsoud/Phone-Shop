import { useEffect, useCallback, useRef } from 'react';

/**
 * Universal keyboard navigation hook for admin sections and modals
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether keyboard navigation is enabled
 * @param {Function} options.onEscape - Handler for Escape key
 * @param {Function} options.onEnter - Handler for Enter key (Ctrl+Enter for confirm actions)
 * @param {Function} options.onArrowUp - Handler for Arrow Up key
 * @param {Function} options.onArrowDown - Handler for Arrow Down key
 * @param {Function} options.onArrowLeft - Handler for Arrow Left key
 * @param {Function} options.onArrowRight - Handler for Arrow Right key
 * @param {Object} options.shortcuts - Object mapping keys to handler functions
 * @param {Array} options.focusableElements - Array of refs to focusable elements for Tab navigation
 * @param {boolean} options.preventDefaultArrows - Whether to prevent default arrow key behavior
 */
export const useKeyboardNavigation = ({
  enabled = true,
  onEscape,
  onEnter,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  shortcuts = {},
  focusableElements = [],
  preventDefaultArrows = false,
} = {}) => {
  const currentFocusIndex = useRef(0);

  // Focus management for Tab navigation
  const focusElement = useCallback((index) => {
    if (focusableElements[index]?.current) {
      focusableElements[index].current.focus();
      currentFocusIndex.current = index;
    }
  }, [focusableElements]);

  const focusNext = useCallback(() => {
    const nextIndex = (currentFocusIndex.current + 1) % focusableElements.length;
    focusElement(nextIndex);
  }, [focusElement, focusableElements.length]);

  const focusPrevious = useCallback(() => {
    const prevIndex = currentFocusIndex.current === 0 
      ? focusableElements.length - 1 
      : currentFocusIndex.current - 1;
    focusElement(prevIndex);
  }, [focusElement, focusableElements.length]);

  // Main keyboard event handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Check if we're in an input field that should handle its own navigation
      const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      const isNumberInput = e.target.type === 'number';

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;

        case 'Enter':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onEnter?.(e);
          }
          break;

        case 'Tab':
          if (focusableElements.length > 0) {
            e.preventDefault();
            if (e.shiftKey) {
              focusPrevious();
            } else {
              focusNext();
            }
          }
          break;

        case 'ArrowUp':
          if (isNumberInput) break; // Let number inputs handle arrows
          if (preventDefaultArrows) e.preventDefault();
          onArrowUp?.(e);
          break;

        case 'ArrowDown':
          if (isNumberInput) break; // Let number inputs handle arrows
          if (preventDefaultArrows) e.preventDefault();
          onArrowDown?.(e);
          break;

        case 'ArrowLeft':
          if (isInInput && !preventDefaultArrows) break; // Let inputs handle cursor movement
          if (preventDefaultArrows) e.preventDefault();
          onArrowLeft?.(e);
          break;

        case 'ArrowRight':
          if (isInInput && !preventDefaultArrows) break; // Let inputs handle cursor movement
          if (preventDefaultArrows) e.preventDefault();
          onArrowRight?.(e);
          break;

        default:
          // Handle custom shortcuts
          const key = e.key.toLowerCase();
          const modifierKey = e.ctrlKey || e.metaKey ? 'ctrl+' : e.altKey ? 'alt+' : '';
          const fullKey = modifierKey + key;
          
          if (shortcuts[fullKey]) {
            e.preventDefault();
            shortcuts[fullKey](e);
          } else if (shortcuts[key]) {
            // Only trigger single-key shortcuts if not in an input
            if (!isInInput) {
              e.preventDefault();
              shortcuts[key](e);
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled, 
    onEscape, 
    onEnter, 
    onArrowUp, 
    onArrowDown, 
    onArrowLeft, 
    onArrowRight, 
    shortcuts, 
    focusNext, 
    focusPrevious, 
    focusableElements.length,
    preventDefaultArrows
  ]);

  // Return utilities for manual focus management
  return {
    focusElement,
    focusNext,
    focusPrevious,
    currentFocusIndex: currentFocusIndex.current,
  };
};

/**
 * Hook specifically for admin section navigation
 * @param {Array} sections - Array of section names
 * @param {number} currentSection - Current active section index
 * @param {Function} setCurrentSection - Function to change current section
 * @param {boolean} enabled - Whether navigation is enabled
 */
export const useAdminSectionNavigation = (sections, currentSection, setCurrentSection, enabled = true) => {
  const shortcuts = {
    'arrowleft': () => {
      const newIndex = currentSection > 0 ? currentSection - 1 : sections.length - 1;
      setCurrentSection(newIndex);
    },
    'arrowright': () => {
      const newIndex = currentSection < sections.length - 1 ? currentSection + 1 : 0;
      setCurrentSection(newIndex);
    },
    // Number keys for direct section access
    '1': () => sections.length > 0 && setCurrentSection(0),
    '2': () => sections.length > 1 && setCurrentSection(1),
    '3': () => sections.length > 2 && setCurrentSection(2),
    '4': () => sections.length > 3 && setCurrentSection(3),
    '5': () => sections.length > 4 && setCurrentSection(4),
    '6': () => sections.length > 5 && setCurrentSection(5),
    '7': () => sections.length > 6 && setCurrentSection(6),
    '8': () => sections.length > 7 && setCurrentSection(7),
    '9': () => sections.length > 8 && setCurrentSection(8),
  };

  return useKeyboardNavigation({
    enabled,
    shortcuts,
    preventDefaultArrows: true,
  });
};

/**
 * Hook for modal keyboard navigation
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Function to close the modal
 * @param {Function} onConfirm - Function to confirm/submit the modal
 * @param {Array} focusableRefs - Array of refs to focusable elements
 * @param {Object} customShortcuts - Additional custom shortcuts
 */
export const useModalKeyboardNavigation = (
  isOpen, 
  onClose, 
  onConfirm, 
  focusableRefs = [], 
  customShortcuts = {}
) => {
  const shortcuts = {
    'ctrl+enter': onConfirm,
    ...customShortcuts
  };

  return useKeyboardNavigation({
    enabled: isOpen,
    onEscape: onClose,
    onEnter: onConfirm,
    shortcuts,
    focusableElements: focusableRefs,
  });
};

export default useKeyboardNavigation;
