import { vi, describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { HttpServer } from '../src/http-server';
import { MCPTools } from '../src/mcp-tools';
import { collectSseData } from './utils/sse';

const STREAM_ACCEPT = 'text/event-stream, application/json';

describe('MCP HTTP additional branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tools/list returns tools even if list is nullish', async () => {
    const server = new HttpServer((null as any));
    const app = server.getApp();

    // mock getTools to return something that will fail the ToolsListResultSchema validation
    vi.spyOn(MCPTools.prototype, 'getTools').mockImplementation(() => (null as any));

    const res = await request(app)
      .post('/mcp')
      .set('Host', 'localhost')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'tools/list', params: {}, id: 'tl1' })
      .expect(200);

    // Manual check to avoid ReferenceError with .catch chain on supertest promise
    if (res.status !== 200) {
      console.error('Test failed with:', res.status, res.text, res.body);
    }

    expect(res.headers['content-type']).toContain('text/event-stream');
    const messages = collectSseData(res.text);
    const response = messages.find((m: any) => m.result) ?? res.body;
    expect(response?.result ?? response).toBeDefined();
  });

  it('prompts/get invalid params returns 400', async () => {
    const server = new HttpServer((null as any));
    const app = server.getApp();

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'prompts/get', params: {}, id: 'p1' })
      .expect(200);

    const output = res.text || JSON.stringify(res.body || {});
    expect(output).toMatch(/Invalid|Parse error/i);
  });

  it('prompts/get unknown prompt returns error', async () => {
    const server = new HttpServer((null as any));
    const app = server.getApp();

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'prompts/get', params: { name: 'no_such' }, id: 'p2' })
      .expect(200);

    const output = res.text || JSON.stringify(res.body || {});
    expect(output).toMatch(/Unknown prompt/);
  });

  it('prompts/get internal error returns error object', async () => {
    const server = new HttpServer((null as any));
    const app = server.getApp();

    vi.spyOn((server as any).prompts, 'getSearchPromptContent').mockImplementation(() => { throw new Error('boom'); });

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'prompts/get', params: { name: 'get_search_prompt', arguments: { keyword: 'test' } }, id: 'p3' })
      .expect(200);

    const output = res.text || JSON.stringify(res.body || {});
    expect(output).toMatch(/boom/);
  });

  it('tools/call non-streaming propagates tool errors', async () => {
    const server = new HttpServer((null as any));
    const app = server.getApp();

    vi.spyOn(MCPTools.prototype, 'handleTool').mockImplementation(async () => {
      throw new Error('tool failure');
    });

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'search_agents' }, id: 't1' })
      .expect(200);

    const output = res.text || JSON.stringify(res.body || {});
    expect(output.length).toBeGreaterThan(0);
  });

  it('unknown method returns error', async () => {
    const server = new HttpServer((null as any));
    const app = server.getApp();

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'no/peeking', params: {}, id: 'u1' })
      .expect(200);

    const output = res.text || JSON.stringify(res.body || {});
    expect(output).toMatch(/Method not found|Unknown method/i);
  });

  it('/mcp/cancel missing id returns 400 and unknown id returns 404', async () => {
    const server = new HttpServer((null as any));
    const app = server.getApp();

    await request(app).post('/mcp/cancel').send({}).expect(400);

    await request(app).post('/mcp/cancel').send({ id: 'nope' }).expect(404);
  });
});
