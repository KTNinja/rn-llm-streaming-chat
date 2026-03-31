import { useRef, useState, useCallback, useEffect } from 'react';
import { useSmoothUpdates } from './useSmoothUpdates';
import { SSEParser, extractLLMToken } from '../utils/parseSSE';

export interface StreamingConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
}

export interface UseStreamingLLMReturn {
  streamedText: string;
  isStreaming: boolean;
  error: string | null;
  startStream: (config: StreamingConfig) => Promise<void>;
  stopStream: () => void;
}

/**
 * Hook for streaming LLM responses using fetch + ReadableStream
 *
 * Features:
 * - Uses native fetch API with ReadableStream (no third-party libraries)
 * - Manual SSE parsing
 * - Smooth text rendering via requestAnimationFrame throttling
 * - Clean cancellation with AbortController
 * - No stale updates or ghost state after stopping
 */
export function useStreamingLLM(): UseStreamingLLMReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const { displayText, appendChunk, reset, finalize } = useSmoothUpdates();

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Cleanup: abort any ongoing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  /**
   * Start streaming from the LLM endpoint
   */
  const startStream = useCallback(
    async (config: StreamingConfig) => {
      // Prevent overlapping streams
      if (isStreaming) {
        console.warn('Stream already in progress');
        return;
      }

      // Increment stream ID to invalidate any stale callbacks
      const currentStreamId = ++streamIdRef.current;

      // Reset state
      reset();
      setError(null);
      setIsStreaming(true);

      // Create new AbortController for this stream
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Make fetch request with ReadableStream
        const response = await fetch(config.url, {
          method: config.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...config.headers,
          },
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response body is available
        if (!response.body) {
          throw new Error('Response body is null');
        }

        // Get ReadableStream reader
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const sseParser = new SSEParser();

        // Read chunks in a loop
        while (true) {
          // Check if this stream was cancelled
          if (currentStreamId !== streamIdRef.current) {
            reader.cancel();
            break;
          }

          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode Uint8Array to text
          const chunk = decoder.decode(value, { stream: true });

          // Parse SSE format
          const messages = sseParser.parseChunk(chunk);

          for (const message of messages) {
            // Check again if stream was cancelled
            if (currentStreamId !== streamIdRef.current) {
              break;
            }

            // Extract token from SSE message
            const token = extractLLMToken(message);

            if (token === null) {
              // [DONE] signal or end of stream
              continue;
            }

            // Append token with smooth updates
            appendChunk(token);
          }
        }

        // Finalize to ensure all buffered text is displayed
        finalize();

        // Only update state if this stream is still the current one
        if (
          isMountedRef.current &&
          currentStreamId === streamIdRef.current
        ) {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      } catch (err: any) {
        // Only update state if component is mounted and stream wasn't cancelled
        if (
          isMountedRef.current &&
          currentStreamId === streamIdRef.current
        ) {
          if (err.name === 'AbortError') {
            console.log('Stream was cancelled');
          } else {
            console.error('Streaming error:', err);
            setError(err.message || 'Streaming failed');
          }
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      }
    },
    [isStreaming, reset, appendChunk, finalize]
  );

  /**
   * Stop the current stream
   * Ensures clean cancellation with no stale updates
   */
  const stopStream = useCallback(() => {
    // Increment stream ID to invalidate callbacks
    streamIdRef.current++;

    // Abort the fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Finalize current text
    finalize();

    if (isMountedRef.current) {
      setIsStreaming(false);
    }
  }, [finalize]);

  return {
    streamedText: displayText,
    isStreaming,
    error,
    startStream,
    stopStream,
  };
}
