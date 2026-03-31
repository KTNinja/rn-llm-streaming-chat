# Architecture Overview

Visual guide to understand how the smooth streaming chat works.

## Component Hierarchy

```
App
 └── ChatScreen
      ├── MessageList
      │    ├── MessageBubble (user)
      │    ├── MessageBubble (assistant)
      │    └── StreamingMessage ← Active stream with cursor
      │
      └── ChatInput
           ├── TextInput
           └── Send/Stop Button
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        ChatScreen                            │
│  State: messages[], inputText                               │
│  Hooks: useStreamingLLM, useSmartScroll                     │
└─────────────────────────────────────────────────────────────┘
           │                                      ▲
           │ startStream()                        │ streamedText
           ▼                                      │
┌─────────────────────────────────────────────────────────────┐
│                    useStreamingLLM                           │
│  • fetch + ReadableStream                                   │
│  • AbortController for cancellation                         │
│  • SSE parsing                                              │
└─────────────────────────────────────────────────────────────┘
           │                                      ▲
           │ appendChunk()                        │ displayText
           ▼                                      │
┌─────────────────────────────────────────────────────────────┐
│                   useSmoothUpdates                           │
│  • requestAnimationFrame throttling                         │
│  • Ref-based buffering                                      │
│  • 60fps max updates                                        │
└─────────────────────────────────────────────────────────────┘
```

## Streaming Pipeline

```
Network Layer          JavaScript Layer         React Layer         UI Layer
─────────────         ──────────────────       ────────────        ─────────

LLM API
  │
  │ SSE Stream
  │ data: {...}
  ▼
fetch()
  │
  │ ReadableStream
  ▼
reader.read()
  │
  │ Uint8Array
  ▼
TextDecoder ─────────► chunk: string
                           │
                           ▼
                      SSEParser
                           │
                           │ Parse "data: ...\n\n"
                           ▼
                      extractLLMToken()
                           │
                           │ token: string
                           ▼
                      bufferRef += token ──────► requestAnimationFrame
                                                        │
                                                        │ 60fps
                                                        ▼
                                                  setState(text) ──────► Text
                                                                         component
                                                                         with cursor ▍
```

## Anti-Burst Mechanism

### Without Throttling (Bursting)

```
Time:     0ms    50ms   100ms  150ms  200ms
          │      │      │      │      │
Chunks:   "Hi"   "my"   "dear" "friend" "!"
          │      │      │      │      │
          ▼      ▼      ▼      ▼      ▼
setState  setState setState setState setState
          │      │      │      │      │
React     └──────┴──────┴──────┴──────┘
Batching         │
                 ▼
Render:     "Hi my dear friend !"  ← BURST!
```

### With RAF Throttling (Smooth)

```
Time:     0ms    16ms   32ms   48ms   64ms
          │      │      │      │      │
Chunks:   "Hi"   "my"   "dear" "friend" "!"
          │      │      │      │      │
          ▼      ▼      ▼      ▼      ▼
Buffer:   "Hi" → "Hi my" → "Hi my dear" → "Hi my dear friend" → "Hi my dear friend !"
          │              │               │                       │
          ▼              ▼               ▼                       ▼
RAF:      setState       setState        setState                setState
          (frame 1)      (frame 2)       (frame 3)               (frame 4)
          │              │               │                       │
          ▼              ▼               ▼                       ▼
Render:   "Hi"    →   "Hi my"    →   "Hi my dear"    →    "Hi my dear friend !"
                                                              ↑
                                                            SMOOTH!
```

## State Management Strategy

```
Component State (useState)
┌─────────────────────────────────────────┐
│ messages: Message[]                     │  ← Completed messages
│ inputText: string                       │  ← User input
│ displayText: string (useSmoothUpdates)  │  ← Streaming display
│ isStreaming: boolean                    │  ← UI state
└─────────────────────────────────────────┘

Ref State (useRef) - Synchronous
┌─────────────────────────────────────────┐
│ bufferRef: string                       │  ← Chunk accumulation
│ rafRef: number | null                   │  ← RAF handle
│ streamIdRef: number                     │  ← Cancellation token
│ isMountedRef: boolean                   │  ← Cleanup guard
│ isUserScrolledRef: boolean              │  ← Scroll state
│ abortControllerRef: AbortController     │  ← Network cancellation
└─────────────────────────────────────────┘
```

## Scroll Behavior

```
User at bottom (auto-scroll enabled):
┌──────────────────┐
│ Message 1        │
│ Message 2        │
│ Message 3        │
│ Streaming...▍    │ ← Auto-scrolls as text appears
└──────────────────┘
        ▲
        │
     50px threshold

User scrolled up (auto-scroll disabled):
┌──────────────────┐
│ Message 2        │ ← User is reading here
│ Message 3        │
│                  │
│                  │
└──────────────────┘
│ Streaming...▍    │ ← Off screen, no hijack
└──────────────────┘
```

## Cancellation Flow

```
User clicks Stop
      │
      ▼
stopStream()
      │
      ├─► streamIdRef++           (invalidate callbacks)
      │
      ├─► abortController.abort()  (cancel network)
      │
      └─► finalize()               (sync buffer → display)

Meanwhile, if chunks arrive:
      │
      ▼
  Check: currentStreamId === streamIdRef.current?
      │
      ├─► NO  → Reject (stale)
      │
      └─► YES → Process

Result: Clean stop, no ghost updates!
```

## SSE Parsing States

```
Initial State:
  buffer = ""

Chunk 1: "data: {\"token\":\"H"
  buffer = "data: {\"token\":\"H"
  messages = []  (incomplete)

Chunk 2: "i\"}\n\ndata: {\"token"
  buffer = "data: {\"token"
  messages = [{data: '{"token":"H"}'}]  ← Extracted!

Chunk 3: "\":\"there\"}\n\n"
  buffer = ""
  messages = [{data: '{"token":"there"}'}]  ← Extracted!
```

## Hook Dependencies

```
useStreamingLLM
    │
    ├─► useSmoothUpdates
    │       └─► requestAnimationFrame
    │
    └─► SSEParser
            └─► extractLLMToken

ChatScreen
    │
    ├─► useStreamingLLM
    │
    └─► useSmartScroll
            └─► ScrollView refs
```

## Message Types

```typescript
// Completed message (in history)
Message {
  id: string           // "user-1234567890"
  text: string         // "Hello, how are you?"
  role: 'user' | 'assistant'
}

// Streaming state (temporary)
{
  streamedText: string    // "I am doing gre"
  isStreaming: true       // Still active
  cursor: visible         // Blinking ▍
}

// Transition on complete
streamedText → New Message in messages[]
```

## Error Handling

```
Error Sources:
┌─────────────────────────────────────┐
│ Network error (timeout, offline)    │ → setError(message)
│ API error (401, 429, 500)          │ → setError(message)
│ Abort (user clicked Stop)          │ → Ignore (expected)
│ Parse error (malformed JSON)       │ → Skip chunk
│ Component unmount                  │ → isMountedRef guard
└─────────────────────────────────────┘
                │
                ▼
        Display error UI
                │
                ▼
        User can retry
```

## Performance Optimization Layers

```
Layer 1: Network
  • ReadableStream (chunked transfer)
  • AbortController (clean cancellation)

Layer 2: Parsing
  • Buffer incomplete chunks
  • Parse only complete messages
  • Extract tokens efficiently

Layer 3: Rendering
  • requestAnimationFrame (60fps)
  • Ref-based buffering (no extra renders)
  • Single setState per frame

Layer 4: UI
  • ScrollView with throttled events
  • Conditional cursor rendering
  • Message memoization (could add)
```

## Comparison to Naive Implementation

```
Naive Approach:
  fetch → chunk → setState(prev + chunk)
  Problem: 200+ setState/sec → Bursting

Our Approach:
  fetch → chunk → buffer → RAF → setState
  Result: 60 setState/sec → Smooth
```

## Mobile Considerations

```
iOS                         Android
────────────────           ─────────────────
• JavaScriptCore VM        • Hermes VM
• UIKit Text rendering     • Android TextView
• 60fps target            • 60fps target
• Bridge batching         • Bridge batching

Common Solution:
• requestAnimationFrame works on both
• Throttles to native frame rate
• Respects bridge batching
• Smooth on both platforms
```

## Future Enhancements

```
Current:                    Potential:
────────────────           ─────────────────
String concatenation  →    Rope data structure
ScrollView           →    FlatList (virtualized)
useState             →    Recoil/Zustand
requestAnimationFrame →   Native module (ultimate)
Manual SSE parsing   →    WebSocket (bidirectional)
```

## Summary

The architecture achieves smooth streaming through:

1. **Decoupling** - Separate concerns (network, parsing, rendering)
2. **Buffering** - Accumulate in refs, not state
3. **Throttling** - requestAnimationFrame for 60fps
4. **Synchronous guards** - Refs for cancellation
5. **Smart UI** - Auto-scroll respects user intent

Result: Buttery smooth LLM streaming on mobile! 🚀
