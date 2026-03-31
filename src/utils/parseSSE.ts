/**
 * Manual SSE (Server-Sent Events) Parser
 *
 * Parses raw SSE text format:
 * data: {"token": "Hello"}
 *
 * data: {"token": " world"}
 *
 * data: [DONE]
 *
 */

export interface SSEMessage {
  data: string;
  event?: string;
  id?: string;
}

/**
 * Parse SSE chunks from a text stream
 * Handles incomplete chunks by maintaining a buffer
 */
export class SSEParser {
  private buffer: string = '';

  /**
   * Process a new chunk of text and extract complete SSE messages
   * @param chunk - Raw text chunk from the stream
   * @returns Array of parsed SSE messages
   */
  parseChunk(chunk: string): SSEMessage[] {
    this.buffer += chunk;
    const messages: SSEMessage[] = [];

    // Split by double newlines (SSE message separator)
    const parts = this.buffer.split('\n\n');

    // Keep the last part as buffer (might be incomplete)
    this.buffer = parts.pop() || '';

    for (const part of parts) {
      const message = this.parseMessage(part);
      if (message) {
        messages.push(message);
      }
    }

    return messages;
  }

  /**
   * Parse a single SSE message block
   * @param text - Complete SSE message text
   * @returns Parsed SSE message or null
   */
  private parseMessage(text: string): SSEMessage | null {
    const lines = text.split('\n');
    const message: SSEMessage = { data: '' };

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        // Extract data after "data: " prefix
        const data = line.slice(6);
        message.data += (message.data ? '\n' : '') + data;
      } else if (line.startsWith('event: ')) {
        message.event = line.slice(7);
      } else if (line.startsWith('id: ')) {
        message.id = line.slice(4);
      }
      // Ignore comment lines starting with ":"
    }

    // Return null for empty messages
    return message.data ? message : null;
  }

  /**
   * Reset the internal buffer
   */
  reset(): void {
    this.buffer = '';
  }

  /**
   * Get any remaining buffered data
   */
  getBuffer(): string {
    return this.buffer;
  }
}

/**
 * Helper function to parse LLM streaming responses
 * Extracts tokens from OpenAI/Anthropic-style JSON chunks
 *
 * @param sseMessage - Parsed SSE message
 * @returns Extracted token/content or null
 */
export function extractLLMToken(sseMessage: SSEMessage): string | null {
  const data = sseMessage.data.trim();

  // Handle [DONE] signal
  if (data === '[DONE]') {
    return null;
  }

  try {
    const json = JSON.parse(data);

    // OpenAI format: choices[0].delta.content
    if (json.choices?.[0]?.delta?.content) {
      return json.choices[0].delta.content;
    }

    // Anthropic format: delta.text
    if (json.delta?.text) {
      return json.delta.text;
    }

    // Generic format: text or token field
    if (json.text) {
      return json.text;
    }

    if (json.token) {
      return json.token;
    }

    return null;
  } catch (error) {
    // Not valid JSON, return as-is if it's plain text
    return data || null;
  }
}
