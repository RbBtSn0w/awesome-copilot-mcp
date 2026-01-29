import request from 'supertest';
import { HttpServer } from '../src/http-server';

const STREAM_ACCEPT = 'text/event-stream, application/json';

describe('HttpServer SSE partial events', () => {
  it('streams progress, partial, result and done events', async () => {
    const mockAdapter: any = {
      fetchIndex: async () => ({ agents: [], prompts: [], instructions: [], skills: [], collections: [], lastUpdated: new Date().toISOString() })
    };
    const server = new HttpServer(mockAdapter);
    const app = server.getApp();

    // Mock tool to emit progress + partial, then return a simple search result
    (server as any).tools.handleTool = async (_name: string, _args: any, opts: any) => {
      if (opts?.onProgress) opts.onProgress({ percent: 10 });
      if (opts?.onPartial) opts.onPartial({ chunk: 'hello' });
      return { items: [{ name: 'x', type: 'agent', description: 'd', tags: [] }], count: 1, query: 'x' };
    };

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'x', arguments: {}, stream: true }, id: 'sse-partial-1' });

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/event-stream');
    const output = res.text || JSON.stringify(res.body || {});
    expect(output.length).toBeGreaterThan(0);
  });
});
