import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { StreamingMessage } from './StreamingMessage';
import { UseSmartScrollReturn } from '../hooks/useSmartScroll';

export interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
}

interface MessageListProps {
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  smartScroll: UseSmartScrollReturn;
}

/**
 * Component that displays the list of messages with smart auto-scrolling
 *
 * Features:
 * - Renders completed messages
 * - Shows streaming message at bottom when active
 * - Smart auto-scroll behavior
 * - Distinguishes between user and assistant messages
 */
export function MessageList({
  messages,
  streamingText,
  isStreaming,
  smartScroll,
}: MessageListProps) {
  const { scrollViewRef, handleScroll, handleContentSizeChange } = smartScroll;

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      onScroll={handleScroll}
      scrollEventThrottle={16} // 60fps
      onContentSizeChange={handleContentSizeChange}
      keyboardShouldPersistTaps="handled"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Show streaming message at the bottom */}
      {isStreaming && (
        <StreamingMessage text={streamingText} isStreaming={isStreaming} />
      )}
    </ScrollView>
  );
}

/**
 * Individual message bubble component
 */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.messageBubbleContainer,
        isUser && styles.userMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser && styles.userText,
          ]}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingVertical: 16,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
    width: '80%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
  },
  userText: {
    color: '#FFFFFF',
  },
});
