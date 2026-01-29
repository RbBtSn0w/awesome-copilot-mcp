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
    collections: []
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
});