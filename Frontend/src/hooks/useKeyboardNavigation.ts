import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (shiftKey: boolean) => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  onEscape,
  onEnter,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onTab,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      switch (event.key) {
        case 'Escape':
          onEscape?.();
          break;
        case 'Enter':
          onEnter?.();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onArrowRight?.();
          break;
        case 'Tab':
          onTab?.(event.shiftKey);
          break;
      }
    }, [onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onTab, enabled]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

export function useTableKeyboardNavigation({
  rowCount,
  onRowSelect,
  onRowAction,
  enabled = true,
}: {
  rowCount: number;
  onRowSelect?: (index: number) => void;
  onRowAction?: (index: number, action: string) => void;
  enabled?: boolean;
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useKeyboardNavigation({
    onArrowUp: () => setFocusedIndex((prev) => Math.max(0, prev - 1)),
    onArrowDown: () => setFocusedIndex((prev) => Math.min(rowCount - 1, prev + 1)),
    onEnter: () => {
      if (focusedIndex >= 0) onRowSelect?.(focusedIndex);
    },
    onEscape: () => setFocusedIndex(-1),
    enabled,
  });

  return { focusedIndex, setFocusedIndex };
}

export function useFocusManagement() {
  const focusStack = useRef<HTMLElement[]>([]);

  const pushFocus = useCallback((element: HTMLElement) => {
    focusStack.current.push(document.activeElement as HTMLElement);
    element.focus();
  }, []);

  const popFocus = useCallback(() => {
    const previous = focusStack.current.pop();
    previous?.focus();
  }, []);

  return { pushFocus, popFocus };
}