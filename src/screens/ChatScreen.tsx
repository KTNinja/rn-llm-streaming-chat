import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Text, Platform } from 'react-native';
import { useStreamingLLM } from '../hooks/useStreamingLLM';
import { useSmartScroll } from '../hooks/useSmartScroll';
import { MessageList, Message } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { API_BASE_URL, API_KEY, MODEL_NAME } from '@env';

/**
 * Main Chat Screen Component
 *
 * Implements a smooth streaming LLM chat interface with:
 * - fetch + ReadableStream for streaming
 * - Manual SSE parsing
 * - requestAnimationFrame throttling to prevent text bursting
 * - Smart auto-scroll that respects user scroll position
 * - Blinking cursor during streaming
 * - Clean Stop button with no stale updates
 */
export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  const {
    streamedText,
    isStreaming,
    error,
    startStream,
    stopStream,
    clearStreamedText,
  } =
    useStreamingLLM();

  const smartScroll = useSmartScroll(isStreaming);

  // Track the previous isStreaming value to detect transitions
  const prevIsStreamingRef = React.useRef(isStreaming);

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(async () => {
    const userMessage = inputText.trim();

    if (!userMessage || isStreaming) {
      return;
    }

    // Debug: Log environment variables
    console.log('Environment variables:', {
      API_BASE_URL,
      API_KEY: API_KEY ? `${API_KEY.substring(0, 10)}...` : 'undefined',
      MODEL_NAME,
    });

    // Add user message to history
    const userMessageObj: Message = {
      id: `user-${Date.now()}`,
      text: userMessage,
      role: 'user',
    };

    setMessages((prev) => [...prev, userMessageObj]);
    setInputText('');

    // Reset scroll state to enable auto-scroll for new response
    smartScroll.resetUserScroll();

    const apiUrl = `${API_BASE_URL}/chat/completions`;
    console.log('Making request to:', apiUrl);

    // Start streaming the LLM response
    await startStream({
      url: apiUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: {
        model: MODEL_NAME || 'gpt-4',
        messages: [
          ...messages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
          { role: 'user', content: userMessage },
        ],
        stream: true,
      },
    });
  }, [inputText, isStreaming, messages, startStream, smartScroll]);

  /**
   * Handle stopping the stream
   * Note: The useEffect will handle adding the message when streaming stops
   */
  const handleStop = useCallback(() => {
    stopStream();
    // Don't add message here - let the useEffect handle it
  }, [stopStream]);

  /**
   * Handle completion of streaming (called internally by hook)
   * This adds the final assistant message to the history
   * IMPORTANT: Only triggers on transition from streaming=true to streaming=false
   */
  React.useEffect(() => {
    const prevIsStreaming = prevIsStreamingRef.current;
    prevIsStreamingRef.current = isStreaming;

    console.log('useEffect triggered:', {
      prevIsStreaming,
      isStreaming,
      streamedText: streamedText?.substring(0, 50),
    });

    // Only add message when we transition from streaming to not streaming
    // AND we have actual content (not empty string)
    if (prevIsStreaming && !isStreaming && streamedText && streamedText.trim().length > 0) {
      console.log('Stream completed - adding message to history');

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        text: streamedText,
        role: 'assistant',
      };

      setMessages((prev) => [...prev, assistantMessage]);
      clearStreamedText();
    }
  }, [isStreaming, streamedText, clearStreamedText]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View
        style={[
          styles.chatContainer,
          {
            paddingTop: topInset + 8,
            paddingBottom: 8,
          },
        ]}
      >
        <MessageList
          messages={messages}
          streamingText={streamedText}
          isStreaming={isStreaming}
          smartScroll={smartScroll}
        />

        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
        />
      </View>

      {/* Error handling - you can customize this */}
      {error && (
        <View
          style={[
            styles.errorContainer,
            {
              top: topInset + 16,
            },
          ]}
        >
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatContainer: {
    flex: 1,
  },
  errorContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
