import { useRef, useState, useCallback, useEffect } from 'react';
import { useSmoothUpdates } from './useSmoothUpdates';
import { SSEParser, extractLLMToken } from '../utils/parseSSE';

export interface StreamingConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
}

export interface UseStreamingLLMReturn {
  streamedText: string;
  isStreaming: boolean;
  error: string | null;
  startStream: (config: StreamingConfig) => Promise<void>;
  stopStream: () => void;
  clearStreamedText: () => void;
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

  const { displayText, appendChunk, reset, finalize, waitForIdle } = useSmoothUpdates();

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
        // Use XMLHttpRequest for streaming support in React Native
        console.log('Making XHR request to:', config.url);

        const xhr = new XMLHttpRequest();
        const sseParser = new SSEParser();
        let lastResponseLength = 0;

        // Set up promise to handle async XHR
        const xhrPromise = new Promise<void>((resolve, reject) => {
          xhr.open(config.method || 'POST', config.url, true);

          // Set headers
          xhr.setRequestHeader('Content-Type', 'application/json');
          if (config.headers) {
            Object.entries(config.headers).forEach(([key, value]) => {
              xhr.setRequestHeader(key, value);
            });
          }

          // Handle progress events for streaming
          xhr.onprogress = () => {
            // Check if stream was cancelled
            if (currentStreamId !== streamIdRef.current) {
              xhr.abort();
              resolve();
              return;
            }

            const responseText = xhr.responseText;
            const newChunk = responseText.substring(lastResponseLength);
            lastResponseLength = responseText.length;

            if (newChunk) {
              // Parse SSE format
              const messages = sseParser.parseChunk(newChunk);

              for (const message of messages) {
                // Check again if stream was cancelled
                if (currentStreamId !== streamIdRef.current) {
                  xhr.abort();
                  resolve();
                  return;
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
          };

          xhr.onload = () => {
            console.log('XHR onload - status:', xhr.status);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              console.log('XHR error response:', xhr.responseText);
              reject(new Error(`HTTP error! status: ${xhr.status}, body: ${xhr.responseText}`));
            }
          };

          xhr.onerror = () => {
            console.log('XHR onerror');
            reject(new Error('Network request failed'));
          };

          xhr.ontimeout = () => {
            console.log('XHR timeout');
            reject(new Error('Request timeout'));
          };

          // Handle abort from AbortController
          abortController.signal.addEventListener('abort', () => {
            xhr.abort();
            resolve();
          });

          // Send the request
          xhr.send(config.body ? JSON.stringify(config.body) : undefined);
        });

        await xhrPromise;

        // Let the paced reveal finish naturally before marking the stream complete
        await waitForIdle();

        // Only update state if this stream is still the current one
        if (
          isMountedRef.current &&
          currentStreamId === streamIdRef.current
        ) {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      } catch (err: unknown) {
        // Only update state if component is mounted and stream wasn't cancelled
        if (
          isMountedRef.current &&
          currentStreamId === streamIdRef.current
        ) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('Stream was cancelled');
          } else {
            console.error('Streaming error:', err);
            setError(err instanceof Error ? err.message : 'Streaming failed');
          }
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      }
    },
    [isStreaming, reset, appendChunk, waitForIdle]
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

  const clearStreamedText = useCallback(() => {
    reset();
  }, [reset]);

  return {
    streamedText: displayText,
    isStreaming,
    error,
    startStream,
    stopStream,
    clearStreamedText,
  };
}
