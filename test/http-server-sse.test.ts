import request from 'supertest';
import { HttpServer } from '../src/http-server';
import { MCPTools } from '../src/mcp-tools';
import { MCPPrompts } from '../src/mcp-prompts';

const STREAM_ACCEPT = 'text/event-stream, application/json';

describe('HttpServer SSE /mcp tools/call', () => {
  let server: HttpServer;
  let app: any;

  beforeEach(() => {
    // mock adapter with minimal interface
    const mockAdapter: any = {
      fetchIndex: async () => ({ agents: [], prompts: [], instructions: [], skills: [], collections: [], lastUpdated: new Date().toISOString() })
    };
    server = new HttpServer(mockAdapter);
    app = server.getApp();
  });

  it('should stream SSE events for tools/call', async () => {
    // mock tool handler to emit progress and result
    server['tools'].handleTool = async (_name: string, _args: any, opts: any) => {
      if (opts && opts.onProgress) opts.onProgress({ percent: 50 });
      return { items: [{ name: 'foo', type: 'agent', description: 'desc', tags: [] }], count: 1, query: 'foo' };
    };

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'test', arguments: {}, stream: true },
        id: 'sse-test-1'
      });

    if (res.status !== 200) {
      // eslint-disable-next-line no-console
      console.log('DEBUG res.status', res.status, 'body:', res.text || JSON.stringify(res.body || {}));
    }
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/event-stream');
    const output = res.text || JSON.stringify(res.body || {});
    expect(output.length).toBeGreaterThan(0);
  });
});
