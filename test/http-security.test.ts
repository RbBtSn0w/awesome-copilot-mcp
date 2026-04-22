import request from 'supertest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpServer } from '../src/http-server';

const STREAM_ACCEPT = 'text/event-stream, application/json';

describe('HttpServer Security', () => {
    const mockAdapter: any = {
        fetchIndex: vi.fn(),
        fetchRawFile: vi.fn(),
    };

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('CORS / Origin Validation', () => {
        it('should allow request with valid origin', async () => {
            const server = new HttpServer(mockAdapter, {
                allowedOrigins: ['http://trusted.com']
            });
            const app = server.getApp();

            try {
                // Use POST to avoid SSE hanging
                await request(app)
                    .post('/mcp')
                    .set('Origin', 'http://trusted.com')
                    .set('Accept', STREAM_ACCEPT)
                    .set('Content-Type', 'application/json')
                    .send({ jsonrpc: '2.0', method: 'ping', id: 1 })
                    .expect(200);
            } finally {
                await server.stop();
            }
        });

        it('should block request with invalid origin', async () => {
            const server = new HttpServer(mockAdapter, {
                allowedOrigins: ['http://trusted.com']
            });
            const app = server.getApp();

            try {
                const res = await request(app)
                    .post('/mcp')
                    .set('Origin', 'http://evil.com')
                    .set('Accept', STREAM_ACCEPT)
                    .set('Content-Type', 'application/json')
                    .send({ jsonrpc: '2.0', method: 'ping', id: 1 })
                    .expect(403);

                expect(res.body.error).toMatch(/Origin not allowed/);
            } finally {
                await server.stop();
            }
        });

        it('should block request with missing origin', async () => {
            const server = new HttpServer(mockAdapter, {
                allowedOrigins: ['http://trusted.com']
            });
            const app = server.getApp();

            try {
                const res = await request(app)
                    .post('/mcp')
                    .set('Accept', STREAM_ACCEPT)
                    .set('Content-Type', 'application/json')
                    .send({ jsonrpc: '2.0', method: 'ping', id: 1 })
                    .expect(403);

                expect(res.body.error).toMatch(/Missing Origin header/);
            } finally {
                await server.stop();
            }
        });
    });

    describe('Authentication', () => {
        it('should allow request with valid Bearer token', async () => {
            const server = new HttpServer(mockAdapter, {
                authToken: 'secret'
            });
            const app = server.getApp();

            try {
                await request(app)
                    .post('/mcp')
                    .set('Authorization', 'Bearer secret')
                    .set('Accept', STREAM_ACCEPT)
                    .set('Content-Type', 'application/json')
                    .send({ jsonrpc: '2.0', method: 'ping', id: 1 })
                    .expect(200);
            } finally {
                await server.stop();
            }
        });

        it('should allow request with valid API Key header', async () => {
            const server = new HttpServer(mockAdapter, {
                authToken: 'secret'
            });
            const app = server.getApp();

            try {
                await request(app)
                    .post('/mcp')
                    .set('x-api-key', 'secret')
                    .set('Accept', STREAM_ACCEPT)
                    .set('Content-Type', 'application/json')
                    .send({ jsonrpc: '2.0', method: 'ping', id: 1 })
                    .expect(200);
            } finally {
                await server.stop();
            }
        });

        it('should block request with invalid token', async () => {
            const server = new HttpServer(mockAdapter, {
                authToken: 'secret'
            });
            const app = server.getApp();

            try {
                await request(app)
                    .post('/mcp')
                    .set('Authorization', 'Bearer wrong')
                    .set('Accept', STREAM_ACCEPT)
                    .expect(401);
            } finally {
                await server.stop();
            }
        });

        it('should block request with missing token', async () => {
            const server = new HttpServer(mockAdapter, {
                authToken: 'secret'
            });
            const app = server.getApp();

            try {
                await request(app)
                    .post('/mcp')
                    .set('Accept', STREAM_ACCEPT)
                    .expect(401);
            } finally {
                await server.stop();
            }
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits', async () => {
            const server = new HttpServer(mockAdapter, {
                rateLimit: { windowMs: 1000, max: 2 }
            });
            const app = server.getApp();

            try {
                // Request 1: OK
                await request(app).post('/mcp')
                    .set('Accept', STREAM_ACCEPT)
                    .set('Content-Type', 'application/json')
                    .send({ jsonrpc: '2.0', method: 'ping', id: 1 })
                    .expect((res) => { if (res.status === 500) console.error('PING 1 ERROR:', res.status, res.body, res.text); })
                    .expect(200);
                // Request 2: OK
                await request(app).post('/mcp')
                    .set('Accept', STREAM_ACCEPT)
                    .set('Content-Type', 'application/json')
                    .send({ jsonrpc: '2.0', method: 'ping', id: 2 })
                    .expect((res) => { if (res.status === 500) console.error('PING 2 ERROR:', res.status, res.body, res.text); })
                    .expect(200);
                // Request 3: Blocked
                await request(app).post('/mcp')
                    .set('Accept', STREAM_ACCEPT)
                    .set('Content-Type', 'application/json')
                    .send({ jsonrpc: '2.0', method: 'ping', id: 3 }).expect(429);
            } finally {
                await server.stop();
            }
        });
    });
});
