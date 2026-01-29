import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListResourceTemplatesRequestSchema, type Request } from '@modelcontextprotocol/sdk/types.js';
import { MCPTools } from './mcp-tools';
import { MCPPrompts } from './mcp-prompts';
import { MCPResources } from './mcp-resources';
import { logger } from './logger';

export interface HandlerHooks {
  onCallStart?: (requestId: string, controller: AbortController) => void;
  onCallEnd?: (requestId: string) => void;
}

export function registerMcpHandlers(server: Server, tools: MCPTools, prompts: MCPPrompts, resources: MCPResources, hooks: HandlerHooks = {}): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: tools.getTools() };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: any, extra) => {
    const { name, arguments: args } = request.params;
    const requestId = extra?.requestId ? String(extra.requestId) : undefined;
    const controller = new AbortController();
    if (requestId && hooks.onCallStart) hooks.onCallStart(requestId, controller);

    try {
      const extraAny = extra as any;
      const result = await tools.handleTool(name, args || {}, {
        signal: controller.signal,
        onProgress: (p: any) => extraAny?.sendProgress?.(p),
        onPartial: (c: any) => extraAny?.sendPartial?.(c),
      });

      return {
        content: [
          {
            type: 'text',
            text: formatResultText(result),
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      logger.error(`Tool execution failed: ${error}`);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    } finally {
      if (requestId && hooks.onCallEnd) hooks.onCallEnd(requestId);
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: prompts.getPrompts() };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request: Request) => {
    const { name, arguments: args } = request.params as any;

    try {
      if (name === 'get_search_prompt') {
        const keyword = (args as any)?.keyword;
        if (keyword === undefined) {
          throw new Error('Missing keyword for get_search_prompt');
        }
        const content = prompts.getSearchPromptContent(keyword);
        return {
          description: 'Interactive prompt guidance for searching awesome-copilot content',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: content,
              },
            },
          ],
        };


      }

      throw new Error(`Unknown prompt: ${name}`);
    } catch (error) {
      logger.error(`Prompt execution failed: ${error}`);
      return {
        description: 'Error',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          },
        ],
      };
    }
  });

  // Resources handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: await resources.getResources() };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return { resourceTemplates: await resources.getResourceTemplates() };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request: Request) => {
    const { uri } = request.params as any;

    try {
      const content = await resources.readResource(uri);
      return {
        contents: [content]
      };
    } catch (error) {
      logger.error(`Failed to read resource ${uri}: ${error}`);
      throw error;
    }
  });
}

function formatResultText(result: any): string {
  if (!result || typeof result !== 'object') return String(result ?? '');

  // SearchResult shape
  if ('items' in result && Array.isArray(result.items)) {
    if (result.items.length === 0) return `No results found for query: "${result.query}"`;
    const lines = [`搜索结果 (${result.count ?? result.items.length}):`, '', '| 名称 | 类型 | 描述 | 标签 |', '|------|------|------|------|'];
    result.items.forEach((item: any) => {
      const tags = item.tags && item.tags.length > 0 ? item.tags.join(', ') : '-';
      const description = item.description ? item.description.substring(0, 50) : '-';
      lines.push(`| ${item.name} | ${item.type} | ${description} | ${tags} |`);
    });
    return lines.join('\n');
  }

  // Loaded content shape
  if ('name' in result) {
    const lines: string[] = [];
    if (result.name) lines.push(`## ${result.name}`);
    if (result.description) lines.push(`\n**描述:** ${result.description}`);
    if (result.type) lines.push(`**类型:** ${result.type}`);
    if (result.tags && result.tags.length > 0) lines.push(`**标签:** ${result.tags.join(', ')}`);
    if (result.type === 'collection' && Array.isArray(result.items) && result.items.length > 0) {
      lines.push(`\n**集合项 (${result.items.length}):**`);
      lines.push('');
      result.items.forEach((item: { path?: string; kind?: string } | string) => {
        if (typeof item === 'object' && item.path && item.kind) {
          lines.push(`- [${item.kind}] ${item.path}`);
        } else {
          lines.push(`- ${item}`);
        }
      });
    }
    // Collections don't have content field - skip content display for them
    if (result.type !== 'collection' && result.content) {
      lines.push(`\n**内容:**\n\n${result.content}`);
    }
    return lines.join('\n');
  }

  return JSON.stringify(result, null, 2);
}
