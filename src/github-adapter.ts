import axios, { AxiosInstance } from 'axios';
import { RepoConfig, IndexData, CacheEntry } from './types';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from './logger';

export class GitHubAdapter {
  private client: AxiosInstance;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private repoConfig: RepoConfig;

  constructor(config: RepoConfig) {
    this.repoConfig = config;

    const headers: Record<string, string> = {
      'User-Agent': 'awesome-copilot-mcp/1.0.0'
    };

    this.client = axios.create({
      headers,
      timeout: 30000
    });
  }

  private getCached<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCached<T>(key: string, data: T, ttl: number = 3600): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private async fetchFile(filePath: string): Promise<string> {
    const cacheKey = `file_${filePath.replace(/\//g, '_')}`;
    const cached = this.getCached<string>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const url = `https://raw.githubusercontent.com/${this.repoConfig.owner}/${this.repoConfig.repo}/${this.repoConfig.branch || 'main'}/${filePath}`;
      const response = await this.client.get(url);
      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      this.setCached(cacheKey, content);
      return content;
    } catch (error) {
      logger.error(`Failed to fetch file ${filePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Public wrapper to fetch raw file content from the repository.
   */
  async fetchRawFile(filePath: string): Promise<string> {
    return this.fetchFile(filePath);
  }

  /**
   * Load all files from a skill directory.
   */
  async loadSkillDirectory(skillName: string): Promise<{ name: string; files: Array<{ path: string; content: string }> }> {
    const index = await this.fetchIndex();
    const skill = index.skills.find(s => s.name === skillName);

    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    const skillDir = skill.path.replace(/\/SKILL\.md$/, '').replace(/SKILL\.md$/, '');
    const fileList = skill.files || ['SKILL.md'];

    const files = await Promise.all(
      fileList.map(async (relativePath: string) => {
        const fullPath = `${skillDir}/${relativePath}`;
        try {
          const content = await this.fetchRawFile(fullPath);
          return { path: relativePath, content };
        } catch (error) {
          logger.warn(`Failed to fetch skill file ${fullPath}: ${error}`);
          return null;
        }
      })
    );

    return {
      name: skillName,
      files: files.filter((f): f is { path: string; content: string } => f !== null)
    };
  }

  private async loadBundledMetadata(): Promise<IndexData | null> {
    try {
      const bundledPath = path.resolve(__dirname, '..', 'metadata.json');
      if (await fs.pathExists(bundledPath)) {
        logger.info(`Loading bundled metadata from ${bundledPath}`);
        const metadata = await fs.readJson(bundledPath);

        if (metadata.version && Array.isArray(metadata.agents)) {
          return {
            agents: metadata.agents || [],
            prompts: metadata.prompts || [],
            instructions: metadata.instructions || [],
            skills: metadata.skills || [],
            collections: metadata.collections || [],
            lastUpdated: metadata.generatedAt || new Date().toISOString()
          };
        }
      }
    } catch (error) {
      logger.warn(`Failed to load bundled metadata: ${error}`);
    }
    return null;
  }

  private async fetchRemoteIndex(): Promise<IndexData> {
    logger.info('Attempting to download lean metadata index...');

    if (this.repoConfig.metadataUrl) {
      try {
        logger.info(`Fetching metadata from hosted URL: ${this.repoConfig.metadataUrl}`);
        const response = await this.client.get(this.repoConfig.metadataUrl);
        const metadata = response.data;

        if (metadata.version && Array.isArray(metadata.agents)) {
          logger.info(`✓ Hosted metadata index loaded (v${metadata.version})`);
          return {
            agents: metadata.agents || [],
            prompts: metadata.prompts || [],
            instructions: metadata.instructions || [],
            skills: metadata.skills || [],
            collections: metadata.collections || [],
            lastUpdated: metadata.generatedAt || new Date().toISOString()
          };
        }
      } catch (err) {
        logger.warn(`Failed to fetch hosted metadata: ${err}`);
      }
    }

    try {
      const content = await this.fetchFile('metadata.json');
      const metadata = JSON.parse(content);

      if (metadata.version && Array.isArray(metadata.agents)) {
        logger.info(`✓ Remote metadata index loaded (v${metadata.version})`);
        return {
          agents: metadata.agents || [],
          prompts: metadata.prompts || [],
          instructions: metadata.instructions || [],
          skills: metadata.skills || [],
          collections: metadata.collections || [],
          lastUpdated: metadata.generatedAt || new Date().toISOString()
        };
      }
      throw new Error('Invalid metadata format');
    } catch (err) {
      logger.error(`Failed to fetch remote index: ${err}`);
      return {
        agents: [], prompts: [], instructions: [], skills: [], collections: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Main entry point for data loading.
   */
  async fetchIndex(forceRemote = false): Promise<IndexData> {
    const cacheKey = 'index_v2';

    if (!forceRemote) {
      const cached = this.getCached<IndexData>(cacheKey);
      if (cached) {
        return cached;
      }

      const bundledMetadata = await this.loadBundledMetadata();
      if (bundledMetadata) {
        this.setCached(cacheKey, bundledMetadata);
        return bundledMetadata;
      }
    }

    const remoteMetadata = await this.fetchRemoteIndex();
    this.setCached(cacheKey, remoteMetadata);
    return remoteMetadata;
  }

  async refresh(): Promise<IndexData> {
    this.memoryCache.clear();
    return this.fetchIndex(true);
  }

  clearCache(): void {
    this.memoryCache.clear();
  }
}