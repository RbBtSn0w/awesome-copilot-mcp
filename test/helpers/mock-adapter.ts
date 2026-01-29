import { GitHubAdapter } from '../../src/github-adapter';
import { RepoConfig, IndexData } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * MockGitHubAdapter for testing without GitHub API calls
 * Uses local fixture files instead of making network requests
 */
export class MockGitHubAdapter extends GitHubAdapter {
    private mockMetadata: IndexData;
    private mockFiles: Map<string, string>;
    private fixturesDir: string;

    constructor(config?: Partial<RepoConfig>) {
        super({
            owner: config?.owner || 'github',
            repo: config?.repo || 'awesome-copilot',
            branch: config?.branch || 'main'
        });

        // Get fixtures directory path
        this.fixturesDir = path.join(__dirname, '../fixtures');

        // Load mock metadata
        const metadataPath = path.join(this.fixturesDir, 'metadata.mock.json');
        this.mockMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

        // Pre-load all mock file contents
        this.mockFiles = new Map();
        this.loadMockFiles();
    }

    /**
     * Recursively load all mock files from fixtures/files directory
     */
    private loadMockFiles(): void {
        const filesDir = path.join(this.fixturesDir, 'files');

        if (!fs.existsSync(filesDir)) {
            return;
        }

        const loadDirectory = (dir: string, prefix = ''): void => {
            const items = fs.readdirSync(dir);

            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativePath = prefix ? path.join(prefix, item) : item;

                if (fs.statSync(fullPath).isDirectory()) {
                    loadDirectory(fullPath, relativePath);
                } else if (item.endsWith('.md')) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    this.mockFiles.set(relativePath, content);
                }
            }
        };

        loadDirectory(filesDir);
    }

    /**
     * Override fetchIndex to return mock data instead of calling API
     */
    async fetchIndex(): Promise<IndexData> {
        return JSON.parse(JSON.stringify(this.mockMetadata)); // Deep clone
    }

    /**
     * Override fetchRawFile to return mock file content
     * This method is used to get individual file contents
     */
    async fetchRawFile(filePath: string): Promise<string> {
        const content = this.mockFiles.get(filePath);

        if (!content) {
            throw new Error(`Mock file not found: ${filePath}. Available files: ${Array.from(this.mockFiles.keys()).join(', ')}`);
        }

        return content;
    }

    /**
     * Override clearCache - no-op for mock adapter
     */
    clearCache(): void {
        // Mock implementation - do nothing
    }

    /**
     * Get list of available mock files (for debugging)
     */
    getMockFilesList(): string[] {
        return Array.from(this.mockFiles.keys());
    }

    /**
     * Override loadSkillDirectory to use mock data
     */
    async loadSkillDirectory(skillName: string): Promise<{ name: string; files: Array<{ path: string; content: string }> }> {
        const skill = this.mockMetadata.skills.find(s => s.name === skillName);
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
                } catch {
                    return null;
                }
            })
        );

        return {
            name: skillName,
            files: files.filter((f): f is { path: string; content: string } => f !== null)
        };
    }
}
/**
 * Factory function to create mock adapter
 */
export function createMockAdapter(config?: Partial<RepoConfig>): MockGitHubAdapter {
    return new MockGitHubAdapter(config);
}

/**
 * Check if tests should use real API or mock
 * Set USE_REAL_API=true environment variable to use real GitHub API
 */
export function shouldUseMockAdapter(): boolean {
    return process.env.USE_REAL_API !== 'true';
}

/**
 * Create adapter based on environment configuration
 * Defaults to mock for tests
 */
export function createTestAdapter(config?: Partial<RepoConfig>): GitHubAdapter | MockGitHubAdapter {
    if (shouldUseMockAdapter()) {
        return createMockAdapter(config);
    }
    return new GitHubAdapter({
        owner: config?.owner || 'github',
        repo: config?.repo || 'awesome-copilot',
        branch: config?.branch || 'main'
    });
}
