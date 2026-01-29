import { describe, it, expect } from 'vitest';
import {
  JSONRPCRequestSchema as JsonRpcRequestSchema,
  CallToolRequestParamsSchema as ToolsCallParamsSchema,
  GetPromptRequestParamsSchema as PromptsGetParamsSchema,
  CallToolResultSchema as ToolsCallResultSchema,
  GetPromptResultSchema as PromptsGetResultSchema,
  ListToolsResultSchema as ToolsListResultSchema
} from '@modelcontextprotocol/sdk/types.js';
import { SseEventEnvelopeSchema } from '../src/sse';

describe('mcp-http-schema (zod)', () => {
  it('validates JsonRpcRequestSchema happy path', () => {
    const parsed = JsonRpcRequestSchema.parse({ jsonrpc: '2.0', method: 'tools/call', id: '1' });
    expect(parsed.method).toBe('tools/call');
  });

  it('rejects JsonRpcRequestSchema missing method', () => {
    const result = JsonRpcRequestSchema.safeParse({ jsonrpc: '2.0' });
    expect(result.success).toBe(false);
  });

  it('validates tools call params with optional args (streaming handled by tasks API)', () => {
    const parsed = ToolsCallParamsSchema.parse({ name: 'search', arguments: { q: 'x' } });
    expect(parsed.name).toBe('search');
    expect((parsed as any).arguments.q).toBe('x');
    // Note: stream/streaming is handled via task-based APIs in the SDK, not a boolean param here.
  });

  it('rejects tools call params missing name', () => {
    const result = ToolsCallParamsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('validates prompts get params', () => {
    const parsed = PromptsGetParamsSchema.parse({ name: 'get_search_prompt' });
    expect(parsed.name).toBeDefined();
  });

  it('validates SSE envelope and rejects bad event', () => {
    const parsed = SseEventEnvelopeSchema.parse({ event: 'progress', requestId: 'r1', payload: { foo: 'bar' } });
    expect(parsed.event).toBe('progress');

    const invalid = SseEventEnvelopeSchema.safeParse({ event: 'unknown', requestId: 'r1' });
    expect(invalid.success).toBe(false);
  });

  it('validates CallToolResult/ToolsCallResult per SDK (empty content is allowed)', () => {
    const ok1 = ToolsCallResultSchema.safeParse({ content: [{ type: 'text', text: 'hello' }] });
    expect(ok1.success).toBe(true);
    const ok2 = ToolsCallResultSchema.safeParse({ structuredContent: { foo: 'bar' } });
    expect(ok2.success).toBe(true);

    // SDK's CallToolResultSchema defaults content to [] and allows an empty result object
    const emptyOk = ToolsCallResultSchema.safeParse({});
    expect(emptyOk.success).toBe(true);
  });

  it('validates PromptsGetResultSchema', () => {
    const parsed = PromptsGetResultSchema.parse({
      description: 'desc',
      messages: [
        { role: 'user', content: { type: 'text', text: 'hello' } }
      ]
    });
    expect((parsed.messages[0].content as any).text).toBe('hello');
  });

  it('validates ToolsListResultSchema', () => {
    const parsed = ToolsListResultSchema.parse({ tools: [{ name: 't1', inputSchema: { type: 'object' } }] });
    expect(parsed.tools).toHaveLength(1);
  });
});
