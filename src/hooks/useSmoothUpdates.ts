import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Hook to prevent text bursting by throttling updates using requestAnimationFrame
 *
 * Problem: When chunks arrive faster than React can render, they accumulate
 * and appear in bursts, creating a jarring experience.
 *
 * Solution: Buffer incoming chunks and update display at 60fps max using RAF.
 * This ensures smooth, consistent rendering regardless of chunk arrival rate.
 */
export function useSmoothUpdates() {
  const [displayText, setDisplayText] = useState('');
  const bufferRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Cancel any pending animation frame on unmount
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  /**
   * Append a chunk to the buffer
   * Schedules a display update on the next animation frame if not already scheduled
   */
  const appendChunk = useCallback((chunk: string) => {
    bufferRef.current += chunk;

    // Schedule update on next frame if not already scheduled
    // This ensures we update at most once per frame (60fps)
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setDisplayText(bufferRef.current);
        }
        rafRef.current = null;
      });
    }
  }, []);

  /**
   * Reset the text and buffer
   */
  const reset = useCallback(() => {
    bufferRef.current = '';
    setDisplayText('');

    // Cancel any pending update
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /**
   * Finalize - ensure the buffer is fully synced to display
   * Useful when stream completes to guarantee all text is shown
   */
  const finalize = useCallback(() => {
    // Cancel any pending RAF
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Immediately sync buffer to display
    if (isMountedRef.current && bufferRef.current !== displayText) {
      setDisplayText(bufferRef.current);
    }
  }, [displayText]);

  /**
   * Get the current buffer content (may be ahead of displayText)
   */
  const getBuffer = useCallback(() => bufferRef.current, []);

  return {
    displayText,
    appendChunk,
    reset,
    finalize,
    getBuffer,
  };
}
