// useLongPress.ts — 500ms long press hook for both touch and mouse events.
// Returns handlers to bind to a div + isPressed state.

import { useCallback, useRef, useState } from "react";

interface LongPressHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

interface UseLongPressOptions {
  onLongPress: (position: { x: number; y: number }) => void;
  delay?: number;
}

export function useLongPress({
  onLongPress,
  delay = 500,
}: UseLongPressOptions): { handlers: LongPressHandlers; isPressed: boolean } {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const longPressTriggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressed(false);
    longPressTriggeredRef.current = false;
  }, []);

  const start = useCallback(
    (position: { x: number; y: number }) => {
      positionRef.current = position;
      longPressTriggeredRef.current = false;
      setIsPressed(true);
      timerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        setIsPressed(false);
        try {
          onLongPress(positionRef.current);
        } catch {
          // silent fail
        }
      }, delay);
    },
    [onLongPress, delay],
  );

  const handlers: LongPressHandlers = {
    onMouseDown: (e: React.MouseEvent) => {
      // Only trigger on left mouse button (button 0)
      if (e.button !== 0) return;
      e.preventDefault();
      start({ x: e.clientX, y: e.clientY });
    },
    onMouseUp: () => {
      clear();
    },
    onMouseLeave: () => {
      clear();
    },
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        start({ x: touch.clientX, y: touch.clientY });
      }
    },
    onTouchEnd: () => {
      clear();
    },
    onTouchMove: () => {
      // Cancel long press if user moves finger
      clear();
    },
    onContextMenu: (e: React.MouseEvent) => {
      // ALWAYS prevent native context menu (Google Lens, Copy Image, etc.)
      // This fires on both right-click and mobile long-press
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return { handlers, isPressed };
}
