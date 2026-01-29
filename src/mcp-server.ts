import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCPTools } from './mcp-tools';
import { MCPPrompts } from './mcp-prompts';
import { MCPResources } from './mcp-resources';
import { GitHubAdapter } from './github-adapter';
import { RepoConfig } from './types';
import { logger } from './logger';
import { registerMcpHandlers } from './mcp-shared';
import pkg from '../package.json';

export class MCPServer {
  private server: Server;
  private tools: MCPTools;
  private prompts: MCPPrompts;
  private resources: MCPResources;

  constructor(config: RepoConfig) {
    const adapter = new GitHubAdapter(config);

    this.tools = new MCPTools(adapter);
    this.prompts = new MCPPrompts();
    this.resources = new MCPResources(adapter);

    this.server = new Server({
      name: 'awesome-copilot-mcp',
      version: pkg.version,
    }, {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
    });
    registerMcpHandlers(this.server, this.tools, this.prompts, this.resources);
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Server started and connected');
  }

  async stop(): Promise<void> {
    await this.server.close();
    logger.info('MCP Server stopped');
  }
}