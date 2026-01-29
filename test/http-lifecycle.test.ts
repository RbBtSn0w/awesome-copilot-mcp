import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpServer } from '../src/http-server';
import http from 'http';
import https from 'https';
import { EventEmitter } from 'events';

describe('HttpServer Lifecycle', () => {
    const mockAdapter: any = {
        fetchIndex: vi.fn(),
        fetchRawFile: vi.fn(),
    };

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should start and stop HTTP server', async () => {
        const server = new HttpServer(mockAdapter, { port: 0 }); // 0 = random port

        await server.start();
        await server.stop();
    });

    it('should handle start errors', async () => {
        // Port -1 is invalid
        const serverInvalid = new HttpServer(mockAdapter, { port: -1 });
        // We expect start to throw/reject
        await expect(serverInvalid.start()).rejects.toThrow();
    });

    it('should handle TLS if provided', async () => {
        // We just verify it calls https.createServer
        const createServerSpy = vi.spyOn(https, 'createServer').mockImplementation(() => {
            const server = new EventEmitter() as any;
            server.listen = (port: any, host: any, cb: any) => cb();
            server.close = (cb: any) => cb();
            return server;
        });

        const server = new HttpServer(mockAdapter, {
            tls: { key: 'key', cert: 'cert' }
        });

        await server.start();
        expect(createServerSpy).toHaveBeenCalled();
        await server.stop();
    });

    it('should double-start safely', async () => {
        const server = new HttpServer(mockAdapter, { port: 0 });
        await server.start();
        await server.start(); // Should return immediately
        await server.stop();
    });

    it('should double-stop safely', async () => {
        const server = new HttpServer(mockAdapter, { port: 0 });
        await server.start();
        await server.stop();
        await server.stop(); // Should do nothing
    });
});
