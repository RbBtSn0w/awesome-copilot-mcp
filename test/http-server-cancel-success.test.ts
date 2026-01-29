import { vi, describe, it, expect } from 'vitest';
import { HttpServer } from '../src/http-server';
import request from 'supertest';

describe('HttpServer cancel endpoint success path', () => {
  it('cancels an active request and removes it', async () => {
    const server = new HttpServer((null as any));
    const app = server.getApp();

    const controller = new AbortController();
    const abortSpy = vi.spyOn(controller, 'abort');

    // Register active request using test helper
    (server as any).addActiveRequestForTest('c1', controller);

    const res = await request(app)
      .post('/mcp/cancel')
      .send({ id: 'c1' })
      .expect(200);

    expect(res.body).toEqual({ id: 'c1', status: 'cancelled' });
    expect(abortSpy).toHaveBeenCalledTimes(1);

    // Subsequent cancel should yield 404 (already removed)
    await request(app)
      .post('/mcp/cancel')
      .send({ id: 'c1' })
      .expect(404);
  });
});
