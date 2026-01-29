import request from 'supertest';
import { HttpServer } from '../src/http-server';
import { collectSseData } from './utils/sse';

const STREAM_ACCEPT = 'text/event-stream, application/json';

describe('HttpServer edge/error/branch coverage', () => {
  let server: HttpServer;
  let app: any;

  beforeEach(() => {
    const mockAdapter: any = {
      fetchIndex: async () => ({ agents: [], prompts: [], instructions: [], skills: [], collections: [], lastUpdated: new Date().toISOString() }),
      fetchRawFile: async (path: string) => path === 'fail' ? Promise.reject(new Error('fail')) : 'ok'
    };
    server = new HttpServer(mockAdapter);
    app = server.getApp();
  });

  it('POST /mcp invalid JSON-RPC returns 400', async () => {
    const res = await request(app).post('/mcp').set('Accept', STREAM_ACCEPT).send({ foo: 'bar' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Invalid JSON-RPC|Parse error/i);
  });

  it('POST /mcp tools/call invalid params returns 400', async () => {
    const res = await request(app).post('/mcp').set('Accept', STREAM_ACCEPT).send({ jsonrpc: '2.0', method: 'tools/call', params: { foo: 'bar' }, id: 1 });
    expect(res.status).toBe(200);
    const messages = collectSseData(res.text);
    const errorMsg = JSON.stringify(messages.find((m: any) => m.error));
    expect(errorMsg).toMatch(/Invalid|Parse error/i);
  });

  it('POST /mcp prompts/get invalid params returns 400', async () => {
    const res = await request(app).post('/mcp').set('Accept', STREAM_ACCEPT).send({ jsonrpc: '2.0', method: 'prompts/get', params: { foo: 'bar' }, id: 1 });
    expect(res.status).toBe(200);
    const messages = collectSseData(res.text);
    const errorMsg = JSON.stringify(messages.find((m: any) => m.error));
    expect(errorMsg).toMatch(/Invalid|Parse error/i);
  });

  it('POST /mcp prompts/get missing keyword returns 400', async () => {
    const res = await request(app).post('/mcp').set('Accept', STREAM_ACCEPT).send({ jsonrpc: '2.0', method: 'prompts/get', params: { name: 'get_search_prompt', arguments: {} }, id: 1 });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toMatch(/Missing keyword/);
  });

  it('POST /mcp unknown method returns error', async () => {
    const res = await request(app).post('/mcp').set('Accept', STREAM_ACCEPT).send({ jsonrpc: '2.0', method: 'not_a_method', params: {}, id: 1 });
    expect(res.status).toBe(200);
    const messages = collectSseData(res.text);
    const errorMsg = JSON.stringify(messages.find((m: any) => m.error));
    expect(errorMsg).toMatch(/Method not found|Unknown method/i);
  });

  it('POST /mcp/cancel missing id returns 400', async () => {
    const res = await request(app).post('/mcp/cancel').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing id/);
  });

  it('POST /mcp/cancel not found returns 404', async () => {
    const res = await request(app).post('/mcp/cancel').send({ id: 'notfound' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Request not found/);
  });
});
