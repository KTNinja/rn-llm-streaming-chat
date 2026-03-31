# API Integration Guide

This guide shows how to connect the chat screen to real LLM APIs.

## OpenAI (GPT-4, GPT-3.5)

### Configuration

Edit [src/screens/ChatScreen.tsx](src/screens/ChatScreen.tsx):

```typescript
await startStream({
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-...', // Your OpenAI API key
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
```

### SSE Format

OpenAI sends:
```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" world"}}]}

data: [DONE]

```

Our `extractLLMToken()` handles this automatically via:
```typescript
if (json.choices?.[0]?.delta?.content) {
  return json.choices[0].delta.content;
}
```

## Anthropic (Claude)

### Configuration

```typescript
await startStream({
  url: 'https://api.anthropic.com/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'sk-ant-...', // Your Anthropic API key
    'anthropic-version': '2023-06-01',
  },
  body: {
    model: 'claude-3-opus-20240229',
    messages: [
      ...messages.map((m) => ({
        role: m.role,
        content: m.text,
      })),
      { role: 'user', content: userMessage },
    ],
    max_tokens: 1024,
    stream: true,
  },
});
```

### SSE Format

Anthropic sends:
```
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}

data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}

data: {"type":"message_stop"}

```

Our `extractLLMToken()` handles this via:
```typescript
if (json.delta?.text) {
  return json.delta.text;
}
```

## Custom Backend

### Backend Implementation (Node.js Example)

```typescript
// server.js
import express from 'express';
import { OpenAI } from 'openai';

const app = express();
app.use(express.json());

app.post('/api/chat/stream', async (req, res) => {
  const { messages } = req.body;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        // Send in SSE format
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### React Native Configuration

```typescript
await startStream({
  url: 'http://localhost:3000/api/chat/stream', // Or your deployed URL
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: {
    messages: [
      ...messages.map((m) => ({
        role: m.role,
        content: m.text,
      })),
      { role: 'user', content: userMessage },
    ],
  },
});
```

## Environment Variables (Recommended)

### 1. Install react-native-config

```bash
npm install react-native-config
cd ios && pod install && cd ..
```

### 2. Create .env file

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
BACKEND_URL=https://your-api.com
```

### 3. Add to .gitignore

```bash
# .gitignore
.env
```

### 4. Use in code

```typescript
import Config from 'react-native-config';

await startStream({
  url: Config.BACKEND_URL + '/chat/stream',
  headers: {
    'Authorization': `Bearer ${Config.OPENAI_API_KEY}`,
  },
  // ...
});
```

## Security Best Practices

### ⚠️ NEVER Commit API Keys

```typescript
// ❌ DON'T DO THIS
const API_KEY = 'sk-1234567890abcdef'; // Hardcoded key

// ✅ DO THIS
import Config from 'react-native-config';
const API_KEY = Config.OPENAI_API_KEY;
```

### Use Backend Proxy (Recommended for Production)

```
React Native App → Your Backend → LLM API
```

Benefits:
- API keys never exposed to client
- Rate limiting and usage tracking
- Request validation and sanitization
- Cost control

Example proxy endpoint:
```typescript
// backend/routes/chat.ts
app.post('/api/chat', authenticateUser, async (req, res) => {
  const { userId } = req.user;

  // Check user quota
  if (await hasExceededQuota(userId)) {
    return res.status(429).json({ error: 'Quota exceeded' });
  }

  // Proxy to OpenAI
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: req.body.messages,
    stream: true,
  });

  // Track usage
  trackUsage(userId, stream);

  // Forward stream
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.end();
});
```

## Testing with Mock API

For development without consuming API credits:

### Option 1: Use mockStreamingAPI.ts

```typescript
// In useStreamingLLM.ts
import { mockStreamingFetch } from '../utils/mockStreamingAPI';

// Replace fetch call:
const response = await mockStreamingFetch(config.url, {
  method: config.method,
  headers: config.headers,
  body: JSON.stringify(config.body),
  signal: abortController.signal,
});
```

### Option 2: Local Mock Server

```typescript
// mock-server.js
const express = require('express');
const app = express();

app.post('/chat', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');

  const words = 'This is a mock streaming response for testing purposes'.split(' ');
  let index = 0;

  const interval = setInterval(() => {
    if (index >= words.length) {
      res.write('data: [DONE]\n\n');
      res.end();
      clearInterval(interval);
      return;
    }

    res.write(`data: ${JSON.stringify({ token: words[index] + ' ' })}\n\n`);
    index++;
  }, 100);
});

app.listen(8080);
```

## Handling Different Response Formats

If your API uses a custom format, update `extractLLMToken()`:

```typescript
// src/utils/parseSSE.ts
export function extractLLMToken(sseMessage: SSEMessage): string | null {
  const data = sseMessage.data.trim();

  if (data === '[DONE]') return null;

  try {
    const json = JSON.parse(data);

    // Add your custom format here:
    if (json.yourCustomField?.token) {
      return json.yourCustomField.token;
    }

    // Existing formats...
    if (json.choices?.[0]?.delta?.content) {
      return json.choices[0].delta.content;
    }

    // ... etc
  } catch (error) {
    return data || null;
  }
}
```

## Error Handling

### Network Errors

```typescript
// In ChatScreen.tsx
const { error } = useStreamingLLM();

if (error) {
  return (
    <View>
      <Text>Error: {error}</Text>
      <Button title="Retry" onPress={handleRetry} />
    </View>
  );
}
```

### Rate Limiting

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  throw new Error(`Rate limited. Retry after ${retryAfter}s`);
}
```

### Timeout

```typescript
const timeoutId = setTimeout(() => {
  abortController.abort();
}, 30000); // 30 second timeout

// Clear timeout when stream completes
clearTimeout(timeoutId);
```

## Platform-Specific Considerations

### iOS

- Use `NSAppTransportSecurity` for HTTP (localhost only):

```xml
<!-- ios/YourApp/Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

### Android

- Add internet permission:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
```

- For localhost on emulator, use `10.0.2.2`:

```typescript
const url = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000/chat'
  : 'http://localhost:3000/chat';
```

## Debugging

### Enable Network Logging

```typescript
// In useStreamingLLM.ts
console.log('Starting stream:', config.url);
console.log('Headers:', config.headers);
console.log('Body:', config.body);

// Log each chunk
const chunk = decoder.decode(value, { stream: true });
console.log('Received chunk:', chunk);
```

### React Native Debugger

1. Install: `npm install -g react-native-debugger`
2. Open app with debugger
3. View Network tab for fetch requests

### Chrome DevTools

For web testing:
1. Run: `npx react-native run-web`
2. Open Chrome DevTools → Network tab
3. Filter by "event-stream"

## Performance Monitoring

```typescript
// Track streaming metrics
const startTime = Date.now();
let chunkCount = 0;
let totalBytes = 0;

const { value } = await reader.read();
chunkCount++;
totalBytes += value.length;

// On completion:
const duration = Date.now() - startTime;
console.log(`Stream completed in ${duration}ms`);
console.log(`Received ${chunkCount} chunks (${totalBytes} bytes)`);
console.log(`Average: ${totalBytes / duration} bytes/ms`);
```

---

## Quick Start Checklist

- [ ] Choose your LLM provider (OpenAI, Anthropic, custom)
- [ ] Get API key
- [ ] Set up environment variables
- [ ] Update [ChatScreen.tsx](src/screens/ChatScreen.tsx) with API config
- [ ] Test with mock API first
- [ ] Test with real API
- [ ] Implement backend proxy for production
- [ ] Add error handling
- [ ] Monitor usage and costs

For more help, see [README.md](README.md) and [TECHNICAL.md](TECHNICAL.md).
