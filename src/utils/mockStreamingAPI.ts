/**
 * Mock Streaming API for Testing
 *
 * This simulates an SSE streaming LLM endpoint for testing purposes.
 * Replace with your actual API in production.
 */

/**
 * Creates a mock ReadableStream that simulates SSE streaming
 */
export function createMockStream(text: string, delayMs: number = 50): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  const tokens = text.split(' ');

  return new ReadableStream({
    async pull(controller) {
      if (index >= tokens.length) {
        // Send [DONE] signal
        const doneMessage = 'data: [DONE]\n\n';
        controller.enqueue(encoder.encode(doneMessage));
        controller.close();
        return;
      }

      // Simulate delay between tokens
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // Format as SSE message
      const token = (index === 0 ? '' : ' ') + tokens[index];
      const sseMessage = `data: ${JSON.stringify({ token })}\n\n`;

      controller.enqueue(encoder.encode(sseMessage));
      index++;
    },
  });
}

/**
 * Mock fetch function that returns a streaming response
 * Use this for testing without a real API
 */
export async function mockStreamingFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock responses for different queries
  const mockResponses: Record<string, string> = {
    'hello': 'Hello! How can I help you today? I\'m a mock streaming assistant.',
    'test': 'This is a test response to verify that streaming works smoothly without any bursting or jumping. Each word should appear naturally, one after another, creating a smooth reading experience.',
    'default': 'I received your message! This is a mock streaming response. The tokens should appear smoothly without bursting. Try scrolling up while streaming to test the smart auto-scroll feature!',
  };

  // Extract prompt from body if available
  let prompt = 'default';
  if (options?.body) {
    try {
      const body = JSON.parse(options.body as string);
      const lastMessage = body.messages?.[body.messages.length - 1]?.content || '';
      prompt = lastMessage.toLowerCase();

      // Find matching mock response
      for (const [key, value] of Object.entries(mockResponses)) {
        if (prompt.includes(key)) {
          prompt = key;
          break;
        }
      }
    } catch (e) {
      // Use default
    }
  }

  const responseText = mockResponses[prompt] || mockResponses['default'];

  // Create mock Response with ReadableStream
  return new Response(createMockStream(responseText), {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
    },
  });
}

/**
 * Example usage in ChatScreen:
 *
 * For testing without a real API, replace the fetch call with:
 *
 * import { mockStreamingFetch } from '../utils/mockStreamingAPI';
 *
 * // In useStreamingLLM.ts, replace:
 * const response = await fetch(config.url, {...});
 *
 * // With:
 * const response = await mockStreamingFetch(config.url, {...});
 */
