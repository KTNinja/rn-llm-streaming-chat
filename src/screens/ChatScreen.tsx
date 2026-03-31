import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useStreamingLLM } from '../hooks/useStreamingLLM';
import { useSmartScroll } from '../hooks/useSmartScroll';
import { MessageList, Message } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';

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

  const { streamedText, isStreaming, error, startStream, stopStream } =
    useStreamingLLM();

  const smartScroll = useSmartScroll(isStreaming);

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(async () => {
    const userMessage = inputText.trim();

    if (!userMessage || isStreaming) {
      return;
    }

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

    // Start streaming the LLM response
    // Note: Replace with your actual API endpoint and configuration
    await startStream({
      url: 'https://api.example.com/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add your API key here
        // 'Authorization': 'Bearer YOUR_API_KEY',
      },
      body: {
        model: 'gpt-4',
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
   */
  const handleStop = useCallback(() => {
    stopStream();

    // Add the current streamed text as a completed message
    if (streamedText) {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        text: streamedText,
        role: 'assistant',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    }
  }, [stopStream, streamedText]);

  /**
   * Handle completion of streaming (called internally by hook)
   * This adds the final assistant message to the history
   */
  React.useEffect(() => {
    // When streaming stops and we have text, add it as a message
    if (!isStreaming && streamedText && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Only add if it's not already the last message
      if (lastMessage.role !== 'assistant' || lastMessage.text !== streamedText) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          text: streamedText,
          role: 'assistant',
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    }
  }, [isStreaming, streamedText, messages]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.chatContainer}>
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
        <View style={styles.errorContainer}>
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
    top: 50,
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
