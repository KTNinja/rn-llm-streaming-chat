import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StreamingMessageProps {
  text: string;
  isStreaming: boolean;
}

/**
 * Component that displays streaming text with a blinking cursor
 *
 * Features:
 * - Blinking cursor ▍ at the end while streaming
 * - Cursor blinks every 500ms
 * - Cursor removed when streaming completes
 */
export function StreamingMessage({
  text,
  isStreaming,
}: StreamingMessageProps) {
  const [showCursor, setShowCursor] = useState(true);
  const hasText = text.trim().length > 0;

  useEffect(() => {
    if (!isStreaming) {
      // Ensure cursor is hidden when not streaming
      setShowCursor(false);
      return;
    }

    // Blink cursor every 500ms while streaming
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  if (!text && !isStreaming) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>
          {hasText ? text : 'Thinking...'}
          {isStreaming && hasText && showCursor && (
            <Text style={styles.cursor}>▍</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  bubble: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '80%',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
  },
  cursor: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});
