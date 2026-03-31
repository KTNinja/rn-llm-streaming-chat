/**
 * Smooth Streaming LLM Chat - Main Exports
 */

// Screens
export { ChatScreen } from './screens/ChatScreen';

// Hooks
export { useStreamingLLM } from './hooks/useStreamingLLM';
export type { UseStreamingLLMReturn, StreamingConfig } from './hooks/useStreamingLLM';
export { useSmoothUpdates } from './hooks/useSmoothUpdates';
export { useSmartScroll } from './hooks/useSmartScroll';
export type { UseSmartScrollReturn } from './hooks/useSmartScroll';

// Components
export { MessageList } from './components/MessageList';
export type { Message } from './components/MessageList';
export { StreamingMessage } from './components/StreamingMessage';
export { ChatInput } from './components/ChatInput';

// Utils
export { SSEParser, extractLLMToken } from './utils/parseSSE';
export type { SSEMessage } from './utils/parseSSE';
export { createMockStream, mockStreamingFetch } from './utils/mockStreamingAPI';
