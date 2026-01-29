import request from 'supertest';
import { HttpServer } from '../src/http-server';

const STREAM_ACCEPT = 'text/event-stream, application/json';

describe('HttpServer prompts/get unknown prompt', () => {
  it('returns error object for unknown prompt name', async () => {
    const mockAdapter: any = {
      fetchIndex: async () => ({ agents: [], prompts: [], instructions: [], skills: [], collections: [], lastUpdated: new Date().toISOString() })
    };
    const server = new HttpServer(mockAdapter);
    const app = server.getApp();

    const res = await request(app)
      .post('/mcp')
      .set('Accept', STREAM_ACCEPT)
      .send({ jsonrpc: '2.0', method: 'prompts/get', params: { name: 'does_not_exist', arguments: {} }, id: 'p-unknown-1' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toMatch(/Unknown prompt/);
  });
});
