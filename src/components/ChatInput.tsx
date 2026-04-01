import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

/**
 * Chat input component with Send/Stop button
 *
 * Features:
 * - Text input for user messages
 * - Button toggles between "Send" and "Stop" based on streaming state
 * - Input disabled while streaming
 * - Keyboard avoiding behavior for better UX
 */
export function ChatInput({
  value,
  onChangeText,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
}: ChatInputProps) {
  const handleButtonPress = () => {
    if (isStreaming) {
      onStop();
    } else {
      onSend();
    }
  };

  const isDisabled = disabled || (!isStreaming && !value.trim());

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder="Type a message..."
            placeholderTextColor="#999999"
            multiline
            maxLength={2000}
            editable={!isStreaming && !disabled}
            returnKeyType="default"
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[
              styles.button,
              isStreaming ? styles.stopButton : styles.sendButton,
              isDisabled && !isStreaming && styles.disabledButton,
            ]}
            onPress={handleButtonPress}
            disabled={isDisabled && !isStreaming}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.buttonText,
                isDisabled && !isStreaming && styles.disabledButtonText,
              ]}
            >
              {isStreaming ? 'Stop' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 14 : 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
    color: '#000000',
  },
  button: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButton: {
    backgroundColor: '#007AFF',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#999999',
  },
});
