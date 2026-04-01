import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubAdapter } from '../src/github-adapter';
import { RepoConfig } from '../src/types';
import axios from 'axios';
import * as fs from 'fs-extra';

// Mock fs-extra
vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
  readJson: vi.fn(),
}));

vi.mock('axios');

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;
  const config: RepoConfig = {
    owner: 'test-owner',
    repo: 'test-repo',
    branch: 'main'
  };

  const mockMetadata = {
    version: '1.0',
    generatedAt: '2025-01-01T00:00:00Z',
    agents: [{ name: 'test-agent', path: 'agents/test.md', type: 'agent' }],
    prompts: [],
    instructions: [],
    skills: [],
    collections: [],
    plugins: [],
    hooks: [],
    workflows: []
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup Axios mock
    (axios.create as any).mockReturnValue({
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    });

    adapter = new GitHubAdapter(config);
  });

  describe('fetchIndex', () => {
    it('should return cached index if available', async () => {
      const metadata = { ...mockMetadata };
      // First call to populate memory cache via bundled load
      vi.mocked(fs.pathExists).mockResolvedValue(true as never);
      vi.mocked(fs.readJson).mockResolvedValue(metadata as never);

      const first = await adapter.fetchIndex();
      expect(first).toEqual({
        agents: metadata.agents,
        prompts: metadata.prompts,
        instructions: metadata.instructions,
        skills: metadata.skills,
        collections: metadata.collections,
        plugins: metadata.plugins,
        hooks: metadata.hooks,
        workflows: metadata.workflows,
        lastUpdated: metadata.generatedAt
      });

      // Second call should return from memory (fs not called again)
      vi.mocked(fs.pathExists).mockClear();
      const second = await adapter.fetchIndex();
      expect(second).toEqual(first);
      expect(fs.pathExists).not.toHaveBeenCalled();
    });

    it('should load bundled metadata if available', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as never);
      vi.mocked(fs.readJson).mockResolvedValue(mockMetadata as never);

      const index = await adapter.fetchIndex();
      expect(index.agents[0].name).toBe('test-agent');
      expect(fs.pathExists).toHaveBeenCalled();
    });

    it('should download remote metadata if bundled file is missing', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as never);

      const mockGet = vi.fn().mockResolvedValue({ data: mockMetadata });
      (axios.create as any).mockReturnValue({ get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } });

      adapter = new GitHubAdapter(config);
      const index = await adapter.fetchIndex();

      expect(index.agents[0].name).toBe('test-agent');
      expect(mockGet).toHaveBeenCalled();
    });

    it('should return empty index if both bundled and remote fail', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as never);
      const mockGet = vi.fn().mockRejectedValue(new Error('Network error'));
      (axios.create as any).mockReturnValue({ get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } });

      adapter = new GitHubAdapter(config);
      const index = await adapter.fetchIndex();
      expect(index.agents).toEqual([]);
    });
  });

  describe('fetchRawFile', () => {
    it('should fetch arbitrary file from raw url', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: 'file content' });
      (axios.create as any).mockReturnValue({ get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } });

      adapter = new GitHubAdapter(config);
      const content = await adapter.fetchRawFile('some/file.txt');
      expect(content).toBe('file content');
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('some/file.txt'));
    });
  });

  describe('refresh', () => {
    it('should bypass memory cache and fetch from remote', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as never);
      vi.mocked(fs.readJson).mockResolvedValue({ ...mockMetadata, generatedAt: 'old' } as never);

      // Warm cache
      await adapter.fetchIndex();

      const mockGet = vi.fn().mockResolvedValue({ data: { ...mockMetadata, generatedAt: 'new' } });
      (axios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      });

      adapter = new GitHubAdapter(config);
      const index = await adapter.refresh();
      expect(index.lastUpdated).toBe('new');
    });
  });

  describe('branch coverage helpers', () => {
    it('expires cache entries based on ttl', () => {
      (adapter as any).memoryCache.set('temp', { data: { ok: true }, timestamp: Date.now() - 5000, ttl: 1 });
      const cached = (adapter as any).getCached('temp');
      expect(cached).toBeNull();
      expect((adapter as any).memoryCache.size).toBe(0);
    });

    it('returns cached file content on subsequent fetches', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: 'file content' });
      (axios.create as any).mockReturnValue({ get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } });

      adapter = new GitHubAdapter(config);
      const first = await adapter.fetchRawFile('path/to/file.txt');
      const second = await adapter.fetchRawFile('path/to/file.txt');

      expect(first).toBe('file content');
      expect(second).toBe('file content');
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('throws when requested skill is missing', async () => {
      vi.spyOn(adapter, 'fetchIndex').mockResolvedValue({
        agents: [],
        prompts: [],
        instructions: [],
        skills: [],
        collections: [],
        plugins: [],
        hooks: [],
        workflows: [],
        lastUpdated: 'now'
      });

      await expect(adapter.loadSkillDirectory('missing-skill')).rejects.toThrow('Skill not found: missing-skill');
    });

    it('returns files for existing skill and filters missing files', async () => {
      vi.spyOn(adapter, 'fetchIndex').mockResolvedValue({
        agents: [],
        prompts: [],
        instructions: [],
        skills: [{ name: 'test-skill', path: 'skills/test-skill/SKILL.md', files: ['SKILL.md', 'EXTRA.md'] }],
        collections: [],
        plugins: [],
        hooks: [],
        workflows: [],
        lastUpdated: 'now'
      });
      const fetchRawFileSpy = vi.spyOn(adapter, 'fetchRawFile').mockImplementation(async fullPath => {
        if (fullPath.endsWith('EXTRA.md')) {
          throw new Error('missing');
        }
        return 'content';
      });

      const result = await adapter.loadSkillDirectory('test-skill');
      expect(result.name).toBe('test-skill');
      expect(result.files).toEqual([{ path: 'SKILL.md', content: 'content' }]);
      expect(fetchRawFileSpy).toHaveBeenCalledWith('skills/test-skill/SKILL.md');
    });

    it('logs and continues when bundled metadata cannot be read', async () => {
      vi.mocked(fs.pathExists).mockRejectedValue(new Error('fs fail') as never);
      const fetchRemoteIndexSpy = vi.spyOn(adapter as any, 'fetchRemoteIndex').mockResolvedValue({
        agents: [],
        prompts: [],
        instructions: [],
        skills: [],
        collections: [],
        plugins: [],
        hooks: [],
        workflows: [],
        lastUpdated: 'remote'
      });

      const index = await adapter.fetchIndex();
      expect(index.lastUpdated).toBe('remote');
      expect(fetchRemoteIndexSpy).toHaveBeenCalled();
    });

    it('uses hosted metadataUrl when provided', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: mockMetadata });
      (axios.create as any).mockReturnValue({ get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } });
      vi.mocked(fs.pathExists).mockResolvedValue(false as never);

      adapter = new GitHubAdapter({ ...config, metadataUrl: 'https://example.com/meta.json' });
      const index = await adapter.fetchIndex(true);

      expect(index.lastUpdated).toBe(mockMetadata.generatedAt);
      expect(mockGet).toHaveBeenCalledWith('https://example.com/meta.json');
    });

    it('falls back to empty index when remote metadata is invalid', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as never);
      const fetchFileSpy = vi.spyOn(adapter as any, 'fetchFile').mockResolvedValue(JSON.stringify({ agents: [] }));
      const index = await adapter.fetchIndex(true);

      expect(index.agents).toEqual([]);
      expect(fetchFileSpy).toHaveBeenCalledWith('metadata.json');
    });

    it('clears cache explicitly', () => {
      (adapter as any).setCached('key', { foo: 'bar' }, 3600);
      adapter.clearCache();
      expect((adapter as any).memoryCache.size).toBe(0);
    });
  });
});
