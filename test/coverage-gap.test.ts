import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubAdapter } from '../src/github-adapter';
import { MCPTools } from '../src/mcp-tools';
import { MCPPrompts } from '../src/mcp-prompts';
import { RepoConfig } from '../src/types';
import * as fs from 'fs-extra';
import axios from 'axios';
import { logger } from '../src/logger';

// Mock dependencies
vi.mock('axios');
vi.mock('fs-extra');
vi.mock('../src/logger');

describe('Coverage Gap Tests', () => {

  describe('GitHubAdapter', () => {
    let adapter: GitHubAdapter;
    const config: RepoConfig = { owner: 'test', repo: 'test' };

    beforeEach(() => {
      vi.clearAllMocks();
      // Mock axios create
      (axios.create as any).mockReturnValue({
        get: vi.fn(),
        interceptors: {
          response: { use: vi.fn() }
        }
      });
      adapter = new GitHubAdapter(config);
    });

    it('should handle fetchFile errors', async () => {
      // mocked client
      const client = (adapter as any).client;
      client.get.mockRejectedValue(new Error('Network error'));

      await expect((adapter as any).fetchFile('some/path')).rejects.toThrow('Network error');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle loadSkillDirectory errors for individual files', async () => {
      // Mock fetchIndex
      vi.spyOn(adapter, 'fetchIndex').mockResolvedValue({
        agents: [], prompts: [], instructions: [], collections: [],
        skills: [{ name: 'test-skill', description: 'desc', tags: [], path: 'skills/test-skill/SKILL.md', files: ['file1.md'], url: '', type: 'skill' }],
        lastUpdated: ''
      });

      // Mock fetchRawFile to fail
      vi.spyOn(adapter, 'fetchRawFile').mockRejectedValue(new Error('Fetch failed'));

      const result = await adapter.loadSkillDirectory('test-skill');
      expect(result.name).toBe('test-skill');
      expect(result.files).toHaveLength(0); // Should filter out failed files
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch skill file'));
    });

    it('should fallback to fetchFile when fetchRemoteIndex primary URL fails', async () => {
      // Config with metadataUrl
      const adapterWithUrl = new GitHubAdapter({ ...config, metadataUrl: 'http://fail.com' });
      const client = (adapterWithUrl as any).client;

      // Primary fails
      client.get.mockImplementation((url: string) => {
        if (url === 'http://fail.com') return Promise.reject(new Error('Primary failed'));
        // Fallback succeeds (mocking fetchFile behavior logic via client.get if it calls it, 
        // but fetchFile calls client.get too. Let's spy on fetchFile instead?
        return Promise.resolve({ data: '{"version":"1.0","agents":[]}' });
      });

      // Spy on fetchFile to ensure it's called as fallback
      const fetchFileSpy = vi.spyOn(adapterWithUrl as any, 'fetchFile').mockResolvedValue(JSON.stringify({ version: '1.0', agents: [] }));

      const index = await (adapterWithUrl as any).fetchRemoteIndex();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch hosted metadata'));
      expect(fetchFileSpy).toHaveBeenCalledWith('metadata.json');
      expect(index.agents).toEqual([]);
    });

    it('should return empty index when all remote fetches fail', async () => {
      const adapterRemote = new GitHubAdapter(config);
      vi.spyOn(adapterRemote as any, 'fetchFile').mockRejectedValue(new Error('All failed'));

      const index = await (adapterRemote as any).fetchRemoteIndex();
      expect(index.agents).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('MCPTools', () => {
    let tools: MCPTools;
    let mockAdapter: any;

    beforeEach(() => {
      mockAdapter = {
        fetchIndex: vi.fn().mockResolvedValue({
          agents: [{ name: 'agent1', type: 'agent', tags: ['tag1'], url: 'https://example.com/agent1.md' }],
          prompts: [], instructions: [], skills: [], collections: []
        }),
        refresh: vi.fn(),
        loadSkillDirectory: vi.fn()
      };
      tools = new MCPTools(mockAdapter);
    });

    it('should throw if signal is aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      await expect(tools.handleTool('search', { query: 'foo' }, { signal: controller.signal }))
        .rejects.toThrow('aborted');
    });

    it('should throw for unknown tool', async () => {
      await expect(tools.handleTool('unknown', {})).rejects.toThrow('Unknown tool');
    });

    it('should filter search by tags correctly', async () => {
      const results = await (tools as any).search({ query: '', tags: ['tag1'] });
      expect(results.count).toBe(1);
      expect(results.items[0].name).toBe('agent1');

      const results2 = await (tools as any).search({ query: '', tags: ['nonexistent'] });
      expect(results2.count).toBe(0);
    });

    it('should throw if search query is missing', async () => {
      await expect((tools as any).search({})).rejects.toThrow('Missing required argument: query');
    });

    it('should throw if download name is missing', async () => {
      await expect((tools as any).download({})).rejects.toThrow('Missing required argument: name');
    });

    it('should download specific types', async () => {
      mockAdapter.fetchIndex.mockResolvedValue({
        agents: [{ name: 'item', type: 'agent', url: 'https://example.com/agent.md' }],
        prompts: [{ name: 'item', type: 'prompt', url: 'https://example.com/prompt.md' }], // same name, diff type
        instructions: [], skills: [], collections: []
      });

      const agent = await (tools as any).download({ name: 'item', type: 'agent' });
      expect(agent.type).toBe('agent');
      expect(agent.url).toBeDefined();

      const prompt = await (tools as any).download({ name: 'item', type: 'prompt' });
      expect(prompt.type).toBe('prompt');
      expect(prompt.url).toBeDefined();
    });
  });

  describe('MCPPrompts', () => {
    it('should validate prompt names', () => {
      const prompts = new MCPPrompts();
      expect(prompts.validatePromptName('get_search_prompt')).toBe(true);
      expect(prompts.validatePromptName('non_existent')).toBe(false);
    });
  });
});
