import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IndexData } from './types';
import { logger } from './logger';

export interface SearchResult {
  query: string;
  count: number;
  items: Array<{
    name: string;
    description: string;
    type: string;
    tags: string[];
    path: string;
  }>;
}

// Minimal adapter interface for tools
interface AdapterLike {
  fetchIndex: () => Promise<IndexData>;
  refresh: () => Promise<IndexData>;
  loadSkillDirectory: (name: string) => Promise<{ name: string; files: Array<{ path: string; content: string }> }>;
}

export class MCPTools {
  private adapter: AdapterLike;

  constructor(adapter: AdapterLike) {
    this.adapter = adapter;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'search',
        description: 'Search for content (agents, prompts, instructions, skills, collections).',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The keyword to search for.'
            },
            type: {
              type: 'string',
              description: 'Optional content type filter (agent, prompt, instruction, skill, collection).',
              enum: ['agent', 'prompt', 'instruction', 'skill', 'collection']
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags.'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return. Default is 10.'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'download',
        description: 'Get the download URL for a specific item. The returned URL can be used directly to fetch and save the file content.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name of the item to download.'
            },
            type: {
              type: 'string',
              description: 'Optional type hint (agent, prompt, instruction, skill, collection) to resolve name collisions.',
              enum: ['agent', 'prompt', 'instruction', 'skill', 'collection']
            }
          },
          required: ['name']
        }
      },
      {
        name: 'refresh_metadata',
        description: 'Force refresh metadata from upstream repository.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'load_skill_directory',
        description: 'Load all files from a skill directory at once. Returns the complete directory structure with all file contents.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The skill name (e.g., webapp-testing)'
            }
          },
          required: ['name']
        }
      }
    ];
  }

  async handleTool(name: string, args: any, opts?: { signal?: AbortSignal; onProgress?: (p: any) => void; onPartial?: (c: any) => void }): Promise<any> {
    try {
      if (opts?.signal?.aborted) throw new Error('aborted');
      switch (name) {
        case 'search': {
          opts?.onProgress?.({ phase: 'searching' });
          const r1 = await this.search(args);
          opts?.onProgress?.({ phase: 'done', count: r1.count });
          return r1;
        }
        case 'download':
          return await this.download(args);
        case 'refresh_metadata':
          return await this.refreshMetadata();
        case 'load_skill_directory':
          return await this.loadSkillDirectory(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error(`Tool execution error: ${error}`);
      throw error;
    }
  }

  private async search(args: { query: string; type?: string; tags?: string[]; limit?: number }): Promise<SearchResult> {
    if (!args || typeof args.query !== 'string') throw new Error('Missing required argument: query');
    const index = await this.adapter.fetchIndex();

    let allItems: any[] = [];
    const type = args.type ? args.type.toLowerCase() : 'all';

    // Filter items by type
    if (type === 'all') {
      allItems = [
        ...index.agents,
        ...index.prompts,
        ...index.instructions,
        ...index.skills,
        ...index.collections
      ];
    } else {
      // Direct type mapping
      if (type === 'agent' || type === 'agents') allItems = index.agents;
      else if (type === 'prompt' || type === 'prompts') allItems = index.prompts;
      else if (type === 'instruction' || type === 'instructions') allItems = index.instructions;
      else if (type === 'skill' || type === 'skills') allItems = index.skills;
      else if (type === 'collection' || type === 'collections') allItems = index.collections;
    }

    return this.performSearch(allItems, args);
  }

  private async download(args: { name: string; type?: string }): Promise<{ name: string; type: string; url: string; path: string; description: string }> {
    if (!args || !args.name) throw new Error('Missing required argument: name');
    const index = await this.adapter.fetchIndex();
    const type = args.type ? args.type.toLowerCase() : null;

    // Helper to find by name within a specific subset
    const findIn = (items: any[]) => items.find(i => i.name === args.name);

    // Return item info with URL for direct download (no content fetching)
    const formatResult = (item: any) => ({
      name: item.name,
      type: item.type,
      url: item.url,
      path: item.path,
      description: item.description
    });

    if (type) {
      if ((type === 'agent' || type === 'agents')) { const f = findIn(index.agents); if (f) return formatResult(f); }
      if ((type === 'skill' || type === 'skills')) { const f = findIn(index.skills); if (f) return formatResult(f); }
      if ((type === 'prompt' || type === 'prompts')) { const f = findIn(index.prompts); if (f) return formatResult(f); }
      if ((type === 'instruction' || type === 'instructions')) { const f = findIn(index.instructions); if (f) return formatResult(f); }
      if ((type === 'collection' || type === 'collections')) { const f = findIn(index.collections); if (f) return formatResult(f); }
    }

    // Generic priority order
    const agent = findIn(index.agents); if (agent) return formatResult(agent);
    const skill = findIn(index.skills); if (skill) return formatResult(skill);
    const prompt = findIn(index.prompts); if (prompt) return formatResult(prompt);
    const instruction = findIn(index.instructions); if (instruction) return formatResult(instruction);
    const collection = findIn(index.collections); if (collection) return formatResult(collection);

    throw new Error(`Item not found: ${args.name}`);
  }

  private async refreshMetadata(): Promise<{ status: string; count: number; updated: string }> {
    const start = Date.now();
    const index = await this.adapter.refresh();
    const count = index.agents.length + index.prompts.length + index.instructions.length + index.skills.length + index.collections.length;

    return {
      status: 'success',
      count,
      updated: index.lastUpdated
    };
  }

  private async loadSkillDirectory(args: { name: string }): Promise<{ name: string; files: Array<{ path: string; content: string }> }> {
    if (!args || !args.name) throw new Error('Missing required argument: name');
    return await this.adapter.loadSkillDirectory(args.name);
  }

  private performSearch(items: any[], args: { query: string; tags?: string[]; limit?: number }): SearchResult {
    const query = args.query.toLowerCase();

    // Normalize requested tags to lowercase to avoid case-sensitive mismatches
    const requestedTags = (Array.isArray(args.tags) ? args.tags : []).map(t => t.toLowerCase());

    let results = items.filter(item => {
      const nameMatch = typeof item.name === 'string' && item.name.toLowerCase().includes(query);
      const descMatch = typeof item.description === 'string' && item.description.toLowerCase().includes(query);
      const tagsLower = Array.isArray(item.tags) ? item.tags.map((t: string) => t.toLowerCase()) : [];
      const tagMatch = tagsLower.some((t: string) => t.includes(query));
      return nameMatch || descMatch || tagMatch;
    });

    if (requestedTags.length > 0) {
      results = results.filter(item => {
        const tagsLower = Array.isArray(item.tags) ? item.tags.map((t: string) => t.toLowerCase()) : [];
        return requestedTags.some(t => tagsLower.includes(t));
      });
    }

    const limit = args.limit || 10;
    results = results.slice(0, limit);

    return {
      query: args.query,
      count: results.length,
      items: results.map(item => ({
        name: item.name,
        description: item.description,
        type: item.type,
        tags: item.tags || [],
        path: item.path
      }))
    };
  }
}
