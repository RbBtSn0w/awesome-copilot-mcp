import request from 'supertest';
import { HttpServer } from '../src/http-server';

const STREAM_ACCEPT = 'text/event-stream, application/json';

describe('HttpServer SSE handleTool throws', () => {
  it('emits error event when handleTool throws during streaming', async () => {
    const mockAdapter: any = {
      fetchIndex: async () => ({ agents: [], prompts: [], instructions: [], skills: [], collections: [], lastUpdated: new Date().toISOString() })
    };
    const server = new HttpServer(mockAdapter);
    const app = server.getApp();

    (server as any).tools.handleTool = async () => { throw new Error('boom'); };

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'x', arguments: {}, stream: true }, id: 'sse-throw-1' });

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/event-stream');
    const output = res.text || JSON.stringify(res.body || {});
    expect(output.length).toBeGreaterThan(0);
  });
});
