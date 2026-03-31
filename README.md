# Smooth Streaming LLM Chat - React Native

A minimal React Native chat screen that connects to streaming LLM endpoints and renders responses smoothly on both iOS and Android.

## Features

✅ **Smooth Streaming** - No text bursting or jumping, natural token-by-token rendering
✅ **Native APIs** - Uses `fetch` + ReadableStream (no third-party streaming libraries)
✅ **Manual SSE Parsing** - Custom Server-Sent Events parser
✅ **Blinking Cursor** - Visual indicator (▍) during active streaming
✅ **Clean Cancellation** - Stop button with no stale updates or ghost state
✅ **Smart Auto-Scroll** - Follows new content but respects user scroll position
✅ **Cross-Platform** - Consistent experience on iOS and Android

## Architecture

### Core Components

```
src/
├── screens/
│   └── ChatScreen.tsx          # Main chat UI
├── hooks/
│   ├── useStreamingLLM.ts      # fetch + ReadableStream streaming
│   ├── useSmoothUpdates.ts     # requestAnimationFrame throttling
│   └── useSmartScroll.ts       # Auto-scroll with user detection
├── components/
│   ├── MessageList.tsx         # ScrollView with messages
│   ├── StreamingMessage.tsx    # Active stream with blinking cursor
│   └── ChatInput.tsx           # Input + Send/Stop button
└── utils/
    └── parseSSE.ts             # Manual SSE parser
```

### How It Works

1. **SSE Parsing** (`parseSSE.ts`)
   - Manually parses Server-Sent Events format: `data: {...}\n\n`
   - Handles incomplete chunks with buffer accumulation
   - Extracts JSON payloads and tokens

2. **Smooth Updates** (`useSmoothUpdates.ts`)
   - Prevents text "bursting" by throttling updates
   - Uses `requestAnimationFrame` to sync at 60fps max
   - Buffers incoming chunks in refs to avoid state batching

3. **Streaming** (`useStreamingLLM.ts`)
   - Uses native `fetch` API with `ReadableStream`
   - Reads chunks with `reader.read()` in a loop
   - Decodes `Uint8Array` → text with `TextDecoder`
   - Clean cancellation via `AbortController`

4. **Smart Scroll** (`useSmartScroll.ts`)
   - Tracks user scroll position
   - Auto-scrolls only when user is at bottom
   - Respects manual scrolling (doesn't hijack)

## Installation

### Prerequisites

- Node.js 18+ and npm
- React Native CLI (`npm install -g react-native-cli`)
- React Native development environment set up ([guide](https://reactnative.dev/docs/environment-setup))
- For iOS: Xcode 14+ and CocoaPods (macOS only)
- For Android: Android Studio with SDK, JDK 11+

**Note:** This repository contains the JavaScript/TypeScript source code only. The native iOS and Android project folders need to be initialized separately (see step 3 below).

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd rn-llm-streaming-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize React Native project structure**
   ```bash
   # This creates the ios/ and android/ folders with native code
   npx react-native init TempProject --skip-install

   # Copy the native folders to your project
   cp -r TempProject/ios ./
   cp -r TempProject/android ./
   rm -rf TempProject
   ```

4. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and add your actual API credentials
   # Required: API_BASE_URL and API_KEY
   ```

5. **Android-specific setup**
   ```bash
   # Copy the local.properties example if it exists
   # Otherwise, create android/local.properties manually
   cp android/local.properties.example android/local.properties

   # Edit android/local.properties and update sdk.dir to your Android SDK path
   ```

6. **iOS setup** (macOS only)
   ```bash
   cd ios && pod install && cd ..
   ```

7. **Run the app**
   ```bash
   # Start Metro bundler
   npm start

   # In another terminal:
   # iOS (macOS only)
   npm run ios

   # Android
   npm run android
   ```

## Usage

### Basic Implementation

```tsx
import React from 'react';
import { ChatScreen } from './src/screens/ChatScreen';

export default function App() {
  return <ChatScreen />;
}
```

### Configure Your LLM Endpoint

Edit [src/screens/ChatScreen.tsx](src/screens/ChatScreen.tsx#L48-L67) to configure your API:

```typescript
await startStream({
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY',
  },
  body: {
    model: 'gpt-4',
    messages: [{ role: 'user', content: userMessage }],
    stream: true,
  },
});
```

### Supported LLM APIs

This implementation works with any LLM API that supports SSE streaming:

- **OpenAI** (GPT-4, GPT-3.5)
- **Anthropic** (Claude)
- **Custom LLM endpoints**

The SSE parser handles multiple formats automatically via `extractLLMToken()`.

## Key Technical Solutions

### Anti-Burst Strategy

```typescript
// Buffer chunks, update display at 60fps max
const bufferRef = useRef('');
const rafRef = useRef(null);

const appendChunk = (chunk: string) => {
  bufferRef.current += chunk;
  if (!rafRef.current) {
    rafRef.current = requestAnimationFrame(() => {
      setDisplayText(bufferRef.current);
      rafRef.current = null;
    });
  }
};
```

### SSE Parsing

```typescript
// Parse "data: {...}\n\n" format
parseChunk(chunk: string): SSEMessage[] {
  this.buffer += chunk;
  const parts = this.buffer.split('\n\n');
  this.buffer = parts.pop() || '';

  return parts.map(part => this.parseMessage(part));
}
```

### Clean Cancellation

```typescript
// AbortController + stream ID prevents stale updates
const stopStream = () => {
  streamIdRef.current++; // Invalidate current stream
  abortControllerRef.current?.abort();
  finalize(); // Sync buffer to display
};
```

### Smart Auto-Scroll

```typescript
// Only auto-scroll if user is at bottom
const handleContentSizeChange = () => {
  if (!isUserScrolledRef.current && isStreaming) {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }
};
```

## Why No Third-Party Libraries?

1. **Full Control** - Custom throttling and chunk processing
2. **Mobile Optimization** - React Native-specific optimizations
3. **Smaller Bundle** - No unnecessary dependencies
4. **Learning** - Understand streaming mechanics deeply
5. **Reliability** - No breaking changes from external packages

## Testing

### Manual Testing Checklist

- [ ] Text flows smoothly without bursts
- [ ] Cursor blinks during streaming (▍)
- [ ] Stop button halts stream immediately
- [ ] No ghost updates after stop
- [ ] Auto-scroll follows when at bottom
- [ ] Scroll not hijacked when user scrolls up
- [ ] Works on both iOS and Android
- [ ] Handles network errors gracefully
- [ ] Multiple rapid messages don't overlap

## Customization

### Change Cursor Style

Edit [src/components/StreamingMessage.tsx](src/components/StreamingMessage.tsx#L42):

```typescript
{isStreaming && showCursor && (
  <Text style={styles.cursor}>|</Text> // Change from ▍ to |
)}
```

### Adjust Throttling Rate

Edit [src/hooks/useSmoothUpdates.ts](src/hooks/useSmoothUpdates.ts#L35):

```typescript
// Change from requestAnimationFrame (60fps) to custom throttle
const throttleMs = 32; // 30fps instead of 60fps
setTimeout(() => setDisplayText(bufferRef.current), throttleMs);
```

### Modify Scroll Threshold

Edit [src/hooks/useSmartScroll.ts](src/hooks/useSmartScroll.ts#L38):

```typescript
const isAtBottom = distanceFromBottom < 100; // Change from 50px to 100px
```

## Troubleshooting

### Text Still Appears in Bursts

- Ensure you're using React Native 0.66+ (ReadableStream support)
- Check that `requestAnimationFrame` throttling is active
- Verify chunks are being processed individually

### Stream Won't Cancel

- Confirm AbortController is properly wired
- Check that `streamIdRef.current++` is incrementing
- Verify cleanup in useEffect return

### Auto-Scroll Not Working

- Check `scrollEventThrottle={16}` is set
- Verify `onContentSizeChange` is connected
- Ensure `resetUserScroll()` is called on new messages

## Requirements

- React Native 0.66+ (ReadableStream support)
- iOS 14+ / Android 6+
- TypeScript 5.0+

## License

MIT

## Contributing

This is an educational implementation. Feel free to adapt and extend for your use case!

---

Built with ❤️ for smooth streaming experiences on mobile.
