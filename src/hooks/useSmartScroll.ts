import { useRef, useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent, ScrollView } from 'react-native';

export interface UseSmartScrollReturn {
  scrollViewRef: React.RefObject<ScrollView>;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleContentSizeChange: (width: number, height: number) => void;
  resetUserScroll: () => void;
}

/**
 * Hook for smart auto-scrolling behavior
 *
 * Features:
 * - Auto-scroll follows new content when user is at bottom
 * - Does NOT hijack scroll when user has scrolled up
 * - Smooth animated scrolling
 * - Respects user intent with threshold detection
 */
export function useSmartScroll(isStreaming: boolean): UseSmartScrollReturn {
  const scrollViewRef = useRef<ScrollView>(null);
  const isUserScrolledRef = useRef(false);

  /**
   * Handle scroll events to detect if user has scrolled away from bottom
   */
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;

      // Calculate distance from bottom
      const distanceFromBottom =
        contentSize.height - contentOffset.y - layoutMeasurement.height;

      // Consider user "at bottom" if within 50px threshold
      // This accounts for small scroll variations and floating point precision
      const isAtBottom = distanceFromBottom < 50;

      // Mark as user-scrolled if they're not at bottom
      isUserScrolledRef.current = !isAtBottom;
    },
    []
  );

  /**
   * Handle content size changes (when new content is added)
   * Auto-scroll only if user hasn't manually scrolled up
   */
  const handleContentSizeChange = useCallback(
    (_width: number, _height: number) => {
      // Only auto-scroll if:
      // 1. User hasn't scrolled up (is at bottom)
      // 2. Stream is active (new content is being added)
      if (!isUserScrolledRef.current && isStreaming) {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    },
    [isStreaming]
  );

  /**
   * Reset user scroll state
   * Call this when a new message starts to enable auto-scroll
   */
  const resetUserScroll = useCallback(() => {
    isUserScrolledRef.current = false;
  }, []);

  return {
    scrollViewRef,
    handleScroll,
    handleContentSizeChange,
    resetUserScroll,
  };
}
