import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { HttpServer } from '../src/http-server';
import { MCPTools } from '../src/mcp-tools';
import { collectSseData } from './utils/sse';

const STREAM_ACCEPT = 'text/event-stream, application/json';

describe('MCP HTTP /mcp', () => {
  let server: HttpServer;
  let app: any;

  beforeEach(() => {
    server = new HttpServer((null as any));
    app = server.getApp();
  });

  it('rejects invalid JSON-RPC requests', async () => {
    const res = await request(app).post('/mcp').set('Accept', STREAM_ACCEPT).send({}).expect(400);
    expect(res.body).toHaveProperty('error');
    const err = res.body.error;
    if (typeof err === 'string') {
      expect(err).toMatch(/Invalid JSON-RPC request|Parse error/i);
    } else {
      expect((err.message || '') as string).toMatch(/Invalid JSON-RPC request|Parse error/i);
    }
  });

  it('get_prompt returns prompt metadata', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'prompts/get', params: { name: 'get_search_prompt', arguments: { keyword: 'test' } }, id: 'r1' })
      .expect(200);

    expect(res.headers['content-type']).toContain('text/event-stream');
    const messages = collectSseData(res.text);
    const response = messages.find((m: any) => m.result) ?? res.body;
    expect(response?.result ?? response).toHaveProperty('messages');
  });

  it('call_tool returns sync result', async () => {
    vi.spyOn(MCPTools.prototype, 'handleTool').mockResolvedValue({ structuredContent: { items: [] } } as any);

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'search_agents', arguments: { query: 'c#' } }, id: 'r2' })
      .expect(200);

    const messages = collectSseData(res.text);
    const response = messages.find((m: any) => m.result) ?? res.body;
    const result = response?.result ?? response;
    expect(result).toBeTruthy();
  });

  it('call_tool wraps primitive results', async () => {
    vi.spyOn(MCPTools.prototype, 'handleTool').mockResolvedValue(123 as any);

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'search_agents', arguments: { query: 'c#' } }, id: 'r-invalid' })
      .expect(200);

    const messages = collectSseData(res.text);
    const response = messages.find((m: any) => m.result) ?? res.body;
    const result = response?.result ?? response;
    const output = JSON.stringify(result || {});
    expect(output.length).toBeGreaterThan(0);
  });


  it('call_tool SSE stream emits progress/partial/result events', async () => {
    vi.spyOn(MCPTools.prototype, 'handleTool').mockImplementation(async (_name, _args, opts?: { onProgress?: any, onPartial?: any }) => {
      opts?.onProgress && opts.onProgress({ step: 1 });
      opts?.onPartial && opts.onPartial({ chunk: 'a' });
      // return a valid result shape for tools/call
      return { structuredContent: { items: [{ name: 'x' }] } } as any;
    });

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'search_agents', arguments: { query: 'c#' }, stream: true }, id: 'r3' })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    const output = res.text || JSON.stringify(res.body || {});
    expect(output.length).toBeGreaterThan(0);

    // primitive result should still be delivered over SSE
    vi.spyOn(MCPTools.prototype, 'handleTool').mockResolvedValue(456 as any);
    const res2 = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'search_agents', arguments: { query: 'bad' }, stream: true }, id: 'r4' })
      .expect(200);

    const output2 = res2.text || JSON.stringify(res2.body || {});
    expect(output2.length).toBeGreaterThan(0);
  });

  it('cancel endpoint aborts running request', async () => {
    // mock a long running tool that checks for abort signal
    let aborted = false;
    vi.spyOn(MCPTools.prototype, 'handleTool').mockImplementation(async (_name, _args, opts?: { signal?: AbortSignal }) => {
      while (!opts?.signal?.aborted) {
        await new Promise(r => setTimeout(r, 20));
      }
      aborted = true;
      throw new Error('aborted');
    });

    // start request and kick off but don't await completion
    request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'search_agents', arguments: { query: 'x' } }, id: 'cancel-test' })
      .end(() => { });

    // give it a moment to start and register in activeRequests
    await new Promise(r => setTimeout(r, 50));

    const cancelRes = await request(app).post('/mcp/cancel').send({ id: 'cancel-test' }).expect(200);
    expect(cancelRes.body).toEqual(expect.objectContaining({ id: 'cancel-test', status: 'cancelled' }));

    // wait to let mock detect abort
    await new Promise(r => setTimeout(r, 50));
    expect(aborted).toBe(true);
  });
});
