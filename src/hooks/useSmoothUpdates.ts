import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Hook to smooth streamed text on React Native.
 *
 * Problem: native/network layers often deliver chunks in bursts, so even if we
 * render at most once per frame the UI can still jump by whole words or lines.
 *
 * Solution: keep the full response buffered, then reveal only part of the
 * backlog on each animation frame. This creates a paced typewriter effect while
 * still catching up quickly if the transport delivers large batches.
 */
export function useSmoothUpdates() {
  const [displayText, setDisplayText] = useState('');
  const bufferRef = useRef('');
  const pendingCharsRef = useRef<string[]>([]);
  const visibleTextRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);
  const isMountedRef = useRef(true);
  const idleResolversRef = useRef<Array<() => void>>([]);

  const resolveIdle = useCallback(() => {
    const resolvers = idleResolversRef.current;
    idleResolversRef.current = [];
    resolvers.forEach((resolve) => resolve());
  }, []);

  const cancelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastFrameTimeRef.current = null;
    accumulatedMsRef.current = 0;
  }, []);

  const getCharIntervalMs = useCallback((backlog: number) => {
    if (backlog > 240) {
      return 18;
    }

    if (backlog > 120) {
      return 22;
    }

    if (backlog > 40) {
      return 26;
    }

    return 32;
  }, []);

  const revealNextFrame = useCallback((timestamp: number) => {
    rafRef.current = null;

    if (!isMountedRef.current) {
      return;
    }

    if (!pendingCharsRef.current.length) {
      lastFrameTimeRef.current = null;
      accumulatedMsRef.current = 0;
      resolveIdle();
      return;
    }

    const elapsedMs =
      lastFrameTimeRef.current === null
        ? 16
        : Math.min(64, timestamp - lastFrameTimeRef.current);
    lastFrameTimeRef.current = timestamp;

    accumulatedMsRef.current += elapsedMs;

    const charIntervalMs = getCharIntervalMs(pendingCharsRef.current.length);
    const charsReady = Math.floor(accumulatedMsRef.current / charIntervalMs);

    if (charsReady < 1) {
      rafRef.current = requestAnimationFrame(revealNextFrame);
      return;
    }

    const charsThisFrame = Math.min(2, charsReady);
    accumulatedMsRef.current -= charsThisFrame * charIntervalMs;

    const nextChars = pendingCharsRef.current.splice(0, charsThisFrame);
    visibleTextRef.current += nextChars.join('');
    setDisplayText(visibleTextRef.current);

    if (pendingCharsRef.current.length) {
      rafRef.current = requestAnimationFrame(revealNextFrame);
    } else {
      lastFrameTimeRef.current = null;
      accumulatedMsRef.current = 0;
      resolveIdle();
    }
  }, [getCharIntervalMs, resolveIdle]);

  const scheduleAnimation = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(revealNextFrame);
    }
  }, [revealNextFrame]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cancelAnimation();
    };
  }, [cancelAnimation]);

  /**
   * Append a chunk to the full buffer and queue it for paced reveal.
   */
  const appendChunk = useCallback((chunk: string) => {
    if (!chunk) {
      return;
    }

    bufferRef.current += chunk;
    pendingCharsRef.current.push(...Array.from(chunk));
    scheduleAnimation();
  }, [scheduleAnimation]);

  /**
   * Reset the text and buffer
   */
  const reset = useCallback(() => {
    cancelAnimation();
    bufferRef.current = '';
    pendingCharsRef.current = [];
    visibleTextRef.current = '';
    setDisplayText('');
    resolveIdle();
  }, [cancelAnimation, resolveIdle]);

  /**
   * Finalize by immediately flushing any unrevealed backlog to the UI.
   * This keeps completion and Stop feeling responsive.
   */
  const finalize = useCallback(() => {
    cancelAnimation();
    pendingCharsRef.current = [];
    visibleTextRef.current = bufferRef.current;
    resolveIdle();

    // Immediately sync buffer to display
    if (isMountedRef.current && bufferRef.current !== displayText) {
      setDisplayText(bufferRef.current);
    }
  }, [cancelAnimation, displayText, resolveIdle]);

  const waitForIdle = useCallback(() => {
    if (!pendingCharsRef.current.length && rafRef.current === null) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      idleResolversRef.current.push(resolve);
    });
  }, []);

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
    waitForIdle,
  };
}
