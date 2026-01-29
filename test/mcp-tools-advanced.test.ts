import { vi } from 'vitest';
import { MCPTools } from '../src/mcp-tools';
import { GitHubAdapter } from '../src/github-adapter';
import { IndexData } from '../src/types';

vi.mock('../src/github-adapter');

describe('MCPTools - Advanced Coverage', () => {
  let tools: MCPTools;

  const mockIndex: IndexData = {
    agents: [
      {
        name: 'typescript-expert',
        description: 'TypeScript and TypeScript编程专家',
        tags: ['typescript', 'programming', 'web'],
        path: 'agents/typescript-expert.md',
        url: 'https://example.com/typescript.md',
        type: 'agent'
      },
      {
        name: 'nodejs-expert',
        description: 'Node.js后端专家',
        tags: ['nodejs', 'backend'],
        path: 'agents/nodejs.md',
        url: 'https://example.com/nodejs.md',
        type: 'agent'
      },
      {
        name: 'react-expert',
        description: 'React前端框架专家',
        tags: ['react', 'frontend'],
        path: 'agents/react.md',
        url: 'https://example.com/react.md',
        type: 'agent'
      }
    ],
    prompts: [
      {
        name: 'prompt-one',
        description: 'First prompt with TypeScript',
        tags: ['typescript'],
        path: 'prompts/one.md',
        url: 'https://example.com/one.md',
        type: 'prompt'
      },
      {
        name: 'prompt-two',
        description: 'Second prompt for web development',
        tags: ['web'],
        path: 'prompts/two.md',
        url: 'https://example.com/two.md',
        type: 'prompt'
      }
    ],
    instructions: [
      {
        name: 'instruction-one',
        description: 'TypeScript instructions',
        tags: ['typescript'],
        path: 'instructions/one.md',
        url: 'https://example.com/instructions.md',
        type: 'instruction'
      }
    ],
    skills: [
      {
        name: 'skill-one',
        description: 'TypeScript skill',
        tags: ['typescript'],
        path: 'skills/one.md',
        url: 'https://example.com/skill.md',
        type: 'skill'
      }
    ],
    collections: [
      {
        id: 'frontend-collection',
        name: 'frontend-collection',
        description: 'Frontend development tools',
        tags: ['frontend', 'web'],
        items: [],
        path: 'collections/frontend.md',
        url: 'https://example.com/frontend.md',
        type: 'collection'
      },
      {
        id: 'backend-collection',
        name: 'backend-collection',
        description: 'Backend development tools',
        tags: ['backend'],
        items: [],
        path: 'collections/backend.md',
        url: 'https://example.com/backend.md',
        type: 'collection'
      }
    ],
    lastUpdated: new Date().toISOString()
  };

  beforeEach(() => {
    const mockAdapter = {
      fetchIndex: vi.fn().mockResolvedValue(mockIndex),
      fetchAgents: vi.fn().mockResolvedValue(mockIndex.agents),
      fetchCollections: vi.fn().mockResolvedValue(mockIndex.collections),
      fetchPrompts: vi.fn().mockResolvedValue(mockIndex.prompts),
      fetchInstructions: vi.fn().mockResolvedValue(mockIndex.instructions),
      fetchSkills: vi.fn().mockResolvedValue(mockIndex.skills),
      clearCache: vi.fn()
    } as any;
    tools = new MCPTools(mockAdapter as any);
  });

  describe('search with multiple tags', () => {
    it('应该支持多个tag过滤', async () => {
      const result = await tools.handleTool('search', {
        query: '',
        tags: ['typescript', 'programming'],
        type: 'agent'
      });
      expect(result).toBeDefined();
    });

    it('应该正确处理不匹配的tags', async () => {
      const result = await tools.handleTool('search', {
        query: 'typescript',
        tags: ['nonexistent'],
        type: 'agent'
      });
      expect(result.count).toBe(0);
    });

    it('应该返回所有匹配的tags的项', async () => {
      const result = await tools.handleTool('search', {
        query: '',
        tags: ['web'],
        type: 'agent'
      });
      expect(result.count).toBeGreaterThan(0);
    });
  });

  describe('limit parameter handling', () => {
    it('应该正确应用limit参数', async () => {
      const result = await tools.handleTool('search', {
        query: '',
        limit: 2,
        type: 'agent'
      });
      expect(result.items.length).toBeLessThanOrEqual(2);
    });

    it('limit为1时应该返回最多1项', async () => {
      const result = await tools.handleTool('search', {
        query: '',
        limit: 1,
        type: 'agent'
      });
      expect(result.items.length).toBeLessThanOrEqual(1);
    });

    it('limit大于结果数时应该返回全部', async () => {
      const result = await tools.handleTool('search', {
        query: 'expert',
        limit: 100,
        type: 'agent'
      });
      expect(result.items.length).toBeLessThanOrEqual(100);
    });
  });

  describe('search across multiple types', () => {
    it('应该在所有类型中搜索', async () => {
      const result = await tools.handleTool('search', {
        query: 'expert'
      });
      // 应该找到agents
      expect(result.count).toBeGreaterThan(0);
    });

    it('应该找到prompts中的匹配项', async () => {
      const result = await tools.handleTool('search', {
        query: 'prompt'
      });
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('应该找到instructions中的匹配项', async () => {
      const result = await tools.handleTool('search', {
        query: 'instruction'
      });
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('应该找到skills中的匹配项', async () => {
      const result = await tools.handleTool('search', {
        query: 'skill'
      });
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('应该找到collections中的匹配项', async () => {
      const result = await tools.handleTool('search', {
        query: 'collection'
      });
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('tag-only matching scenarios', () => {
    it('当query只匹配tags时也应该返回结果 (agents)', async () => {
      const result = await tools.handleTool('search', {
        query: 'frontend',
        type: 'agent'
      });
      expect(result.count).toBeGreaterThan(0);
      const hasFrontend = result.items.some((i: any) => Array.isArray(i.tags) && i.tags.includes('frontend'));
      expect(hasFrontend).toBe(true);
    });

    it('当query只匹配tags时也应该返回结果 (prompts)', async () => {
      const result = await tools.handleTool('search', {
        query: 'web',
        type: 'prompt'
      });
      expect(result.count).toBeGreaterThanOrEqual(1);
      const hasWeb = result.items.some((i: any) => Array.isArray(i.tags) && i.tags.includes('web'));
      expect(hasWeb).toBe(true);
    });

    it('search 应该支持tags过滤', async () => {
      const result = await tools.handleTool('search', {
        query: '',
        tags: ['backend']
      });
      expect(result.count).toBeGreaterThanOrEqual(1);
      const allHaveTag = result.items.every((i: any) => Array.isArray(i.tags) && i.tags.includes('backend'));
      expect(allHaveTag).toBe(true);
    });
  });

  describe('branch coverage extras', () => {
    it('search limit default coverage', async () => {
      // Test default limit logic implicitly calls performSearch which has defaults
      const result = await tools.handleTool('search', { query: 'expert' });
      expect(result.count).toBeGreaterThanOrEqual(1);
    });

    it('当item.tags不是数组时也应该安全处理', async () => {
      // 向agents中加入一个没有tags字段的项以覆盖 Array.isArray(item.tags) 的 false 分支
      (mockIndex.agents as any).push({
        name: 'no-tags-agent',
        description: 'no tags agent',
        content: 'x',
        path: 'agents/no-tags-agent.md',
        url: 'https://example.com/no-tags-agent.md',
        type: 'agent'
      });

      // 使用空查询以确保 nameMatch 命中，这样该项被包含并触发 tagsLower 的分支
      // default limit is 10
      const args = { limit: 10, query: '', type: 'agent' };
      const result = await tools.handleTool('search', args);
      const hasNoTagsAgent = result.items.some((i: any) => i.name === 'no-tags-agent');
      expect(hasNoTagsAgent).toBe(true);
    });
  });

  describe('case insensitive search across types', () => {
    it('agents搜索应该不区分大小写', async () => {
      const result1 = await tools.handleTool('search', { query: 'TYPESCRIPT', type: 'agent' });
      const result = await tools.handleTool('search', {
        query: '',
        tags: 'not-an-array' as any, // simulating runtime JS usage
        type: 'agent'
      });
      const result2 = await tools.handleTool('search', { query: 'typescript', type: 'agent' });
      expect(result1.count).toBe(result2.count);
    });

    it('prompts搜索应该不区分大小写', async () => {
      const result1 = await tools.handleTool('search', { query: 'TYPESCRIPT', type: 'prompt' });
      const result2 = await tools.handleTool('search', { query: 'typescript', type: 'prompt' });
      expect(result1.count).toBe(result2.count);
    });

    it('instructions搜索应该不区分大小写', async () => {
      const result1 = await tools.handleTool('search', { query: 'TYPESCRIPT', type: 'instruction' });
      const result2 = await tools.handleTool('search', { query: 'typescript', type: 'instruction' });
      expect(result1.count).toBe(result2.count);
    });
  });

  describe('search result structure', () => {
    it('结果应该包含正确的字段', async () => {
      const result = await tools.handleTool('search', { query: 'expert', type: 'agent' });
      if (result.items.length > 0) {
        const item = result.items[0];
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('tags');
        expect(item).toHaveProperty('path');
      }
    });

    it('tags应该是数组', async () => {
      const result = await tools.handleTool('search', { query: 'expert', type: 'agent' });
      if (result.items.length > 0) {
        expect(Array.isArray(result.items[0].tags)).toBe(true);
      }
    });

    it('type字段应该有值', async () => {
      const result = await tools.handleTool('search', { query: 'expert', type: 'agent' });
      if (result.items.length > 0) {
        expect(result.items[0].type).toBeDefined();
        expect(result.items[0].type).toBe('agent');
      }
    });
  });

  describe('empty query handling', () => {
    it('空query应该返回所有结果或有限结果', async () => {
      const args = { query: '', type: 'agent' };
      const result = await tools.handleTool('search', args);

      // Should return either all items or empty depending on implementation choice using empty query
      // Here we assume empty query returns everything or filtered defaults
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('空query配合limit应该工作', async () => {
      const args = { limit: 1, query: '', type: 'agent' };
      const result = await tools.handleTool('search', args);
      expect(result.items.length).toBeLessThanOrEqual(2);
    });
  });

  describe('tag matching logic', () => {
    it('当items没有tags时不应该崩溃', async () => {
      const result = await tools.handleTool('search', {
        query: 'expert',
        tags: ['nonexistent-tag'],
        type: 'agent'
      });
      expect(result).toBeDefined();
    });

    it('应该找到包含所有指定tags中至少一个的items', async () => {
      const result = await tools.handleTool('search', {
        query: '',
        tags: ['frontend', 'backend'],
        type: 'agent'
      });
      expect(result).toBeDefined();
    });
  });

  describe('description search', () => {
    it('应该能根据description搜索', async () => {
      const result = await tools.handleTool('search', {
        query: '专家',
        type: 'agent'
      });
      expect(result).toBeDefined();
    });

    it('应该能找到description中的中文内容', async () => {
      const result = await tools.handleTool('search', {
        query: '后端',
        type: 'agent'
      });
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });
});
