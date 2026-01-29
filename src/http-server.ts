import type { Express, Request, Response, NextFunction } from 'express';
import express from 'express';
import http from 'http';
import https from 'https';
import { hostHeaderValidation, localhostHostValidation } from '@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { IndexData, Agent, Prompt, Instruction, Skill, Collection } from './types';
import { logger } from './logger';
import pkg from '../package.json';
import { MCPTools } from './mcp-tools';
import { MCPPrompts } from './mcp-prompts';
import { MCPResources } from './mcp-resources';
import { registerMcpHandlers } from './mcp-shared';

interface HttpServerOptions {
  port?: number;
  host?: string;
  authToken?: string;
  allowedOrigins?: string[];
  allowedHosts?: string[];
  bodyLimit?: string;
  rateLimit?: { windowMs: number; max: number };
  tls?: { key: string | Buffer; cert: string | Buffer; ca?: string | Buffer };
}

type HttpServerResolvedOptions = Required<Pick<HttpServerOptions, 'port' | 'host'>> & Omit<HttpServerOptions, 'port' | 'host'> & {
  bodyLimit: string;
};

// Minimal adapter interface to improve testability
interface AdapterLike {
  fetchIndex: () => Promise<IndexData>;
  refresh: () => Promise<IndexData>;
  loadSkillDirectory: (name: string) => Promise<{ name: string; files: Array<{ path: string; content: string }> }>;
}

export class HttpServer {
  private app: Express;
  private server?: http.Server | https.Server;
  private adapter: AdapterLike;
  private options: HttpServerResolvedOptions;
  private tools: MCPTools;
  private prompts: MCPPrompts;
  private resources: MCPResources;
  private mcpServer: Server;
  private transport: StreamableHTTPServerTransport;
  // Promote activeRequests to a class member so tests can validate cancel logic
  private activeRequests = new Map<string, { controller: AbortController }>();
  private connected = false;
  private connectPromise?: Promise<void>;

  constructor(adapter: AdapterLike, options: HttpServerOptions = {}) {
    this.adapter = adapter;
    this.options = {
      port: options.port ?? 8080,
      host: options.host ?? '127.0.0.1',
      authToken: options.authToken,
      allowedOrigins: options.allowedOrigins,
      allowedHosts: options.allowedHosts,
      bodyLimit: options.bodyLimit ?? '1mb',
      rateLimit: options.rateLimit,
      tls: options.tls,
    };

    // Use createMcpExpressApp directly as the main application
    this.app = createMcpExpressApp({
      host: this.options.host ?? '127.0.0.1',
      allowedHosts: this.options.allowedHosts
    });

    // Apply security/custom middlewares
    // Note: createMcpExpressApp already includes express.json() and host validation.
    this.configureSecurity();

    // Initialize MCP helpers
    this.tools = new MCPTools(this.adapter);
    this.prompts = new MCPPrompts();
    this.resources = new MCPResources(this.adapter as any);

    // Shared MCP server + transport (stateless mode)
    this.mcpServer = new Server({
      name: 'awesome-copilot-mcp',
      version: pkg.version,
    }, {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
    });

    registerMcpHandlers(this.mcpServer, this.tools, this.prompts, this.resources, {
      onCallStart: (requestId, controller) => {
        if (requestId) this.activeRequests.set(requestId, { controller });
      },
      onCallEnd: (requestId) => {
        if (!requestId) return;
        this.activeRequests.delete(requestId);
        // Ensure any lingering SSE streams for this request are closed
        this.transport.closeSSEStream(requestId);
      }
    });

    this.transport = new StreamableHTTPServerTransport({
      // Stateless mode to simplify client usage; callers must still send both JSON and SSE accept headers
      sessionIdGenerator: undefined,
    });

    // Register routes
    this.setupRoutes(this.app);

    // Attach error handlers
    this.attachErrorHandlers(this.app);
  }
  private attachErrorHandlers(app: Express = this.app) {
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      if (err?.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request entity too large' });
      }
      if (err) return res.status(400).json({ error: err.message || 'Bad Request' });
      next();
    });
  }



  private configureSecurity() {
    // Note: createMcpExpressApp handles:
    // 1. Host header validation 
    // 2. Global JSON parsing (via express.json)

    // We explicitly avoid adding urlencoded parser to encourage strict JSON-RPC usage.

    // Optional origin validation for CORS-like checks on GET requests if explicit config is present

    // Optional origin validation (useful when frontends fetch metadata)
    if (this.options.allowedOrigins?.length) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const rawOrigin = (req.headers.origin as string | undefined) || (req.headers.referer as string | undefined);
        if (!rawOrigin) return res.status(403).json({ error: 'Missing Origin header' });

        let normalizedOrigin = rawOrigin;
        try {
          normalizedOrigin = new URL(rawOrigin).origin;
        } catch {
          // keep raw origin if parsing fails
        }

        if (!this.options.allowedOrigins!.includes(normalizedOrigin)) {
          return res.status(403).json({ error: 'Origin not allowed' });
        }
        next();
      });
    }

    // Optional bearer auth / API key validation
    if (this.options.authToken) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.path === '/health') return next();
        const header = req.headers.authorization || '';
        const apiKey = req.headers['x-api-key'];
        const token = header.startsWith('Bearer ') ? header.substring(7) : header;
        if (token === this.options.authToken || apiKey === this.options.authToken) {
          return next();
        }
        res.status(401).json({ error: 'Unauthorized' });
      });
    }

    // Simple in-memory rate limiting per IP
    if (this.options.rateLimit) {
      const hits = new Map<string, number[]>();
      const { windowMs, max } = this.options.rateLimit;
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const now = Date.now();
        const key = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
        const windowStart = now - windowMs;
        const recent = (hits.get(key) || []).filter((t) => t > windowStart);
        if (recent.length >= max) {
          return res.status(429).json({ error: 'Too Many Requests' });
        }
        recent.push(now);
        hits.set(key, recent);
        next();
      });
    }

  }



  getApp() {
    return this.app;
  }

  private setupRoutes(app: Express) {
    // Helper to handle MCP request via Transport
    const handleMcpRequest = async (req: Request, res: Response) => {
      try {
        await this.ensureConnected();
        // createMcpExpressApp includes body-parser, so we must pass the parsed body
        // to the transport if available.
        await this.transport.handleRequest(req as any, res as any, req.body);
      } catch (error) {
        logger.error(`HTTP MCP request failed: ${error}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to handle MCP request' });
        }
      }
    };

    // Primary MCP Endpoints
    // POST /mcp (JSON-RPC)
    app.post('/mcp', handleMcpRequest);
    // GET /mcp (SSE)
    app.get('/mcp', handleMcpRequest);
    // DELETE /mcp (Session Close)
    app.delete('/mcp', handleMcpRequest);

    // Standard Aliases
    // GET /sse -> /mcp (SSE)
    app.get('/sse', handleMcpRequest);
    // POST /messages -> /mcp (RPC)
    app.post('/messages', handleMcpRequest);

    // Cancel endpoint to abort ongoing requests
    // Body is already JSON-parsed by global middleware
    app.post('/mcp/cancel', (req: Request, res: Response) => {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const active = this.activeRequests.get(id);
      if (!active) return res.status(404).json({ error: 'Request not found or already completed' });
      active.controller.abort();
      this.transport.closeSSEStream(id);
      this.activeRequests.delete(id);
      return res.json({ id, status: 'cancelled' });
    });
  }

  // Test helper: register an active request to validate /mcp/cancel success path
  // Not intended for production usage.
  addActiveRequestForTest(id: string, controller: AbortController) {
    this.activeRequests.set(id, { controller });
  }

  async start(): Promise<void> {
    if (this.server) return;
    await this.ensureConnected();

    return new Promise<void>((resolve, reject) => {
      try {
        const create = () => {
          if (this.options.tls) {
            return https.createServer(this.options.tls!, this.app);
          }
          return http.createServer(this.app);
        };

        this.server = create();
        this.server.listen(this.options.port, this.options.host, () => {
          const protocol = this.options.tls ? 'https' : 'http';
          logger.info(`HTTP server listening on ${protocol}://${this.options.host}:${this.options.port}`);

          this.server!.on('error', (err: any) => {
            logger.error(`Server error: ${err}`);
          });

          resolve();
        });

        this.server.on('error', (err: any) => {
          logger.error(`Failed to start server: ${err}`);
          reject(err);
        });
      } catch (err) {
        logger.error(`Exception during start: ${err}`);
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.server = undefined;
    }

    if (this.connected) {
      await this.transport.close();
      await this.mcpServer.close();
      this.connected = false;
      this.connectPromise = undefined;
    }
  }

  private async ensureConnected() {
    if (this.connected) return;
    if (!this.connectPromise) {
      this.connectPromise = this.mcpServer.connect(this.transport).then(() => {
        this.connected = true;
      });
    }
    return this.connectPromise;
  }
}
