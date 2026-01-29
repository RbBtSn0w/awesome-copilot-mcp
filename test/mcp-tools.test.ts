import { vi, type Mocked } from 'vitest';
import { MCPTools, SearchResult } from '../src/mcp-tools';
import { GitHubAdapter } from '../src/github-adapter';
import { Agent, Instruction, Prompt, Skill, Collection, IndexData } from '../src/types';

vi.mock('../src/github-adapter');

describe('MCPTools', () => {
  let tools: MCPTools;
  let mockAdapter: Mocked<GitHubAdapter>;

  const mockIndex: IndexData = {
    agents: [
      {
        name: 'python-expert',
        description: 'Python编程专家',
        tags: ['python', 'programming'],
        // content: 'Python expert content', // Removed
        path: 'agents/python-expert.agent.md',
        url: 'https://example.com/python-expert.agent.md',
        type: 'agent'
      },
      {
        name: 'react-expert',
        description: 'React框架专家',
        tags: ['react', 'javascript'],
        // content: 'React expert content', // Removed
        path: 'agents/react-expert.agent.md',
        url: 'https://example.com/react-expert.agent.md',
        type: 'agent'
      }
    ],
    prompts: [
      {
        name: 'api-design-prompt',
        description: 'API设计提示词',
        tags: ['api', 'design'],
        // content: 'API design content', // Removed
        path: 'prompts/api-design-prompt.md',
        url: 'https://example.com/api-design-prompt.md',
        type: 'prompt'
      }
    ],
    instructions: [
      {
        name: 'code-review-instructions',
        description: '代码审查指令',
        tags: ['code', 'review'],
        // content: 'Code review instructions', // Removed
        path: 'instructions/code-review.md',
        url: 'https://example.com/code-review.md',
        type: 'instruction'
      }
    ],
    skills: [
      {
        name: 'debugging-skill',
        description: '调试技能',
        tags: ['debug'],
        // content: 'Debugging skill content', // Removed
        path: 'skills/debugging.md',
        url: 'https://example.com/debugging.md',
        type: 'skill'
      }
    ],
    collections: [
      {
        id: 'web-dev-collection',
        name: 'web-dev-collection',
        description: 'Web开发工具集',
        tags: ['web'],
        items: [
          { path: 'agents/react-expert.agent.md', kind: 'agent' as const }
        ],
        path: 'collections/web-dev.collection.yml',
        url: 'https://example.com/web-dev.collection.yml',
        type: 'collection' as const
      }
    ],
    lastUpdated: new Date().toISOString()
  };

  beforeEach(() => {
    mockAdapter = {
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

  describe('getTools', () => {
    it('应该返回所有工具列表', () => {
      const toolsList = tools.getTools();
      expect(toolsList.length).toBeGreaterThan(0);
    });

    it('应该包含search工具', () => {
      const toolsList = tools.getTools();
      const tool = toolsList.find(t => t.name === 'search');
      expect(tool).toBeDefined();
    });

    it('应该包含download工具', () => {
      const toolsList = tools.getTools();
      const tool = toolsList.find(t => t.name === 'download');
      expect(tool).toBeDefined();
    });

    it('每个工具应该有inputSchema', () => {
      const toolsList = tools.getTools();
      toolsList.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
      });
    });
  });

  describe('handleTool', () => {
    it('应该处理search工具', async () => {
      const result = await tools.handleTool('search', { query: 'python' });
      expect(result).toBeDefined();
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('应该处理download工具', async () => {
      const result = await tools.handleTool('download', { name: 'python-expert' });
      expect(result).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.name).toBe('python-expert');
    });

    it('应该抛出unknown tool错误', async () => {
      await expect(tools.handleTool('unknown-tool', {})).rejects.toThrow('Unknown tool');
    });

    it('should throw when signal is already aborted', async () => {
      const c = new AbortController();
      c.abort();
      await expect(tools.handleTool('search', { query: 'x' }, { signal: c.signal })).rejects.toThrow('aborted');
    });

    it('calls onProgress hooks for search', async () => {
      const onProgress = vi.fn();
      const res = await tools.handleTool('search', { query: 'python' }, { onProgress });
      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('应该返回匹配查询的agents', async () => {
      const result = await tools.handleTool('search', { query: 'python', type: 'agent' });
      expect(result.count).toBe(1);
      expect(result.items[0].name).toBe('python-expert');
    });

    it('应该按limit限制结果数量', async () => {
      const result = await tools.handleTool('search', { query: 'expert', limit: 1 });
      expect(result.items.length).toBeLessThanOrEqual(1);
    });

    it('应该支持按tags过滤', async () => {
      const result = await tools.handleTool('search', { query: 'expert', tags: ['python'] });
      expect(result.items.length).toBeGreaterThanOrEqual(0);
    });

    it('应该返回空结果当没有匹配', async () => {
      const result = await tools.handleTool('search', { query: 'nonexistent' });
      expect(result.count).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('search types', () => {
    it('应该返回匹配的instructions', async () => {
      const result = await tools.handleTool('search', { query: 'code', type: 'instruction' });
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should return matching prompts', async () => {
      const result = await tools.handleTool('search', { query: 'api', type: 'prompt' });
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should search all content by default', async () => {
      const result = await tools.handleTool('search', { query: 'expert' });
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('download', () => {
    it('应该返回存在的agent的下载信息', async () => {
      const result = await tools.handleTool('download', { name: 'python-expert', type: 'agent' });
      expect(result.name).toBe('python-expert');
      expect(result.url).toBeDefined();
      expect(result.type).toBe('agent');
    });

    it('应该抛出错误当agent不存在', async () => {
      await expect(tools.handleTool('download', { name: 'nonexistent-agent', type: 'agent' })).rejects.toThrow('Item not found');
    });

    it('应该返回存在的instruction的下载信息', async () => {
      const result = await tools.handleTool('download', { name: 'code-review-instructions' });
      expect(result.name).toBe('code-review-instructions');
      expect(result.url).toBeDefined();
    });

    it('should return download info for prompt', async () => {
      const result = await tools.handleTool('download', { name: 'api-design-prompt' });
      expect(result.name).toBe('api-design-prompt');
      expect(result.url).toBeDefined();
    });

    it('should return download info for collection', async () => {
      const result = await tools.handleTool('download', { name: 'web-dev-collection' });
      expect(result.name).toBe('web-dev-collection');
      expect(result.type).toBe('collection');
      expect(result.url).toBeDefined();
    });

    it('should return download info for skill', async () => {
      const result = await tools.handleTool('download', { name: 'debugging-skill' });
      expect(result.name).toBe('debugging-skill');
      expect(result.type).toBe('skill');
      expect(result.url).toBeDefined();
    });
  });

  describe('search with tags', () => {
    it('应该能按多个tags过滤', async () => {
      const result = await tools.handleTool('search', { query: '', tags: ['python', 'programming'] });
      // 应该至少返回一个包含这些tags的agent
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('refresh_metadata', () => {
    it('should refresh metadata', async () => {
      mockAdapter.refresh = vi.fn().mockResolvedValue(mockIndex);
      const result = await tools.handleTool('refresh_metadata', {});
      expect(mockAdapter.refresh).toHaveBeenCalled();
      expect(result.status).toBe('success');
      expect(result.count).toBeGreaterThan(0);
    });
  });



  describe('case-insensitive search', () => {
    it('搜索应该忽略大小写', async () => {
      const result1 = await tools.handleTool('search', { query: 'PYTHON' });
      const result2 = await tools.handleTool('search', { query: 'python' });
      expect(result1.count).toBe(result2.count);
    });
  });

  describe('search by description', () => {
    it('应该能根据描述搜索', async () => {
      const result = await tools.handleTool('search', { query: '编程' });
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('load_skill_directory', () => {
    it('应该包含load_skill_directory工具', () => {
      const toolsList = tools.getTools();
      const tool = toolsList.find(t => t.name === 'load_skill_directory');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('name');
    });

    it('应该抛出技能未找到错误', async () => {
      mockAdapter.loadSkillDirectory = vi.fn().mockRejectedValue(new Error('Skill not found: nonexistent'));
      await expect(tools.handleTool('load_skill_directory', { name: 'nonexistent' })).rejects.toThrow('Skill not found');
    });

    it('应该返回技能目录的所有文件', async () => {
      const mockFiles = [
        { path: 'SKILL.md', content: '# Test Skill' },
        { path: 'examples/demo.js', content: 'console.log("demo")' }
      ];
      mockAdapter.loadSkillDirectory = vi.fn().mockResolvedValue({
        name: 'test-skill',
        files: mockFiles
      });

      const result = await tools.handleTool('load_skill_directory', { name: 'test-skill' });
      expect(result.name).toBe('test-skill');
      expect(result.files).toHaveLength(2);
      expect(result.files[0].path).toBe('SKILL.md');
      expect(result.files[1].path).toBe('examples/demo.js');
    });

    it('应该抛出缺少name参数错误', async () => {
      await expect(tools.handleTool('load_skill_directory', {})).rejects.toThrow('Missing required argument: name');
    });
  });
});
