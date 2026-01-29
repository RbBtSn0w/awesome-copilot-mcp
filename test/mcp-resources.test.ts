import { describe, it, expect, beforeAll } from 'vitest';
import { MCPResources } from '../src/mcp-resources';
import { createMockAdapter, MockGitHubAdapter } from './helpers/mock-adapter';

describe('MCPResources', () => {
    let adapter: MockGitHubAdapter;
    let resources: MCPResources;

    beforeAll(async () => {
        // ✅ Use mock adapter - 0 GitHub API calls
        adapter = createMockAdapter();
        resources = new MCPResources(adapter as any);
    });

    describe('getResources', () => {
        it('should list all direct resources', async () => {
            const result = await resources.getResources();

            expect(result).toHaveLength(6);
            expect(result[0].uri).toBe('awesome://metadata');
            expect(result[1].uri).toBe('awesome://agents/index');
            expect(result[2].uri).toBe('awesome://prompts/index');
            expect(result[3].uri).toBe('awesome://instructions/index');
            expect(result[4].uri).toBe('awesome://skills/index');
            expect(result[5].uri).toBe('awesome://collections/index');

            // Verify all have required fields
            result.forEach(resource => {
                expect(resource.uri).toBeTruthy();
                expect(resource.name).toBeTruthy();
                expect(resource.description).toBeTruthy();
                expect(resource.mimeType).toBeTruthy();
            });
        });
    });

    describe('getResourceTemplates', () => {
        it('should list all resource templates', async () => {
            const result = await resources.getResourceTemplates();

            expect(result.length).toBeGreaterThan(0);
            expect(result.some(t => t.uriTemplate === 'awesome://agents/{name}')).toBe(true);
            expect(result.some(t => t.uriTemplate === 'awesome://prompts/{name}')).toBe(true);
            expect(result.some(t => t.uriTemplate === 'awesome://instructions/{name}')).toBe(true);
            expect(result.some(t => t.uriTemplate === 'awesome://skills/{name}')).toBe(true);
            expect(result.some(t => t.uriTemplate === 'awesome://collections/{name}')).toBe(true);
            expect(result.some(t => t.uriTemplate === 'awesome://search/{type}/{query}')).toBe(true);
            expect(result.some(t => t.uriTemplate === 'awesome://tags/{tag}')).toBe(true);

            // Verify all have required fields
            result.forEach(template => {
                expect(template.uriTemplate).toBeTruthy();
                expect(template.uriTemplate).toContain('{');
                expect(template.name).toBeTruthy();
                expect(template.description).toBeTruthy();
                expect(template.mimeType).toBeTruthy();
            });
        });
    });

    describe('readResource - Direct Resources', () => {
        it('should read metadata resource', async () => {
            const content = await resources.readResource('awesome://metadata');

            expect(content.uri).toBe('awesome://metadata');
            expect(content.mimeType).toBe('application/json');
            expect(content.text).toBeTruthy();

            const data = JSON.parse(content.text);
            expect(data).toHaveProperty('agents');
            expect(data).toHaveProperty('prompts');
            expect(data).toHaveProperty('instructions');
            expect(data).toHaveProperty('skills');
            expect(data).toHaveProperty('collections');
            expect(Array.isArray(data.agents)).toBe(true);
        });

        it('should read agents index', async () => {
            const content = await resources.readResource('awesome://agents/index');

            expect(content.uri).toBe('awesome://agents/index');
            expect(content.mimeType).toBe('application/json');

            const agents = JSON.parse(content.text);
            expect(Array.isArray(agents)).toBe(true);
            if (agents.length > 0) {
                expect(agents[0]).toHaveProperty('name');
                expect(agents[0]).toHaveProperty('description');
                expect(agents[0]).toHaveProperty('tags');
                expect(agents[0]).toHaveProperty('path');
                expect(agents[0]).toHaveProperty('url');
            }
        });

        it('should read prompts index', async () => {
            const content = await resources.readResource('awesome://prompts/index');

            expect(content.uri).toBe('awesome://prompts/index');
            expect(content.mimeType).toBe('application/json');

            const prompts = JSON.parse(content.text);
            expect(Array.isArray(prompts)).toBe(true);
        });

        it('should read instructions index', async () => {
            const content = await resources.readResource('awesome://instructions/index');

            expect(content.uri).toBe('awesome://instructions/index');
            expect(content.mimeType).toBe('application/json');

            const instructions = JSON.parse(content.text);
            expect(Array.isArray(instructions)).toBe(true);
        });

        it('should read skills index', async () => {
            const content = await resources.readResource('awesome://skills/index');

            expect(content.uri).toBe('awesome://skills/index');
            expect(content.mimeType).toBe('application/json');

            const skills = JSON.parse(content.text);
            expect(Array.isArray(skills)).toBe(true);
        });

        it('should read collections index', async () => {
            const content = await resources.readResource('awesome://collections/index');

            expect(content.uri).toBe('awesome://collections/index');
            expect(content.mimeType).toBe('application/json');

            const collections = JSON.parse(content.text);
            expect(Array.isArray(collections)).toBe(true);
        });
    });

    describe('readResource - Template Resources', () => {
        it('should read agent by name using template', async () => {
            // ✅ Use mock data - test-agent exists in mock fixtures
            const content = await resources.readResource('awesome://agents/test-agent');

            expect(content.uri).toBe('awesome://agents/test-agent');
            expect(content.mimeType).toBe('application/json');
            expect(content.text).toBeTruthy();

            const data = JSON.parse(content.text);
            expect(data).toHaveProperty('name', 'test-agent');
            expect(data).toHaveProperty('url');
            expect(data).toHaveProperty('type', 'agent');
        });

        it('should read prompt by name using template', async () => {
            // ✅ Use mock data - test-prompt exists in fixtures
            const content = await resources.readResource('awesome://prompts/test-prompt');

            expect(content.uri).toBe('awesome://prompts/test-prompt');
            expect(content.mimeType).toBe('application/json');
            expect(content.text).toBeTruthy();

            const data = JSON.parse(content.text);
            expect(data).toHaveProperty('name', 'test-prompt');
            expect(data).toHaveProperty('url');
            expect(data).toHaveProperty('type', 'prompt');
        });

        it('should read collection by name using template', async () => {
            // ✅ Use mock data
            const content = await resources.readResource('awesome://collections/test-collection');

            expect(content.uri).toBe('awesome://collections/test-collection');
            expect(content.mimeType).toBe('application/json');
            expect(content.text).toBeTruthy();

            const collection = JSON.parse(content.text);
            expect(collection).toHaveProperty('name');
            expect(collection).toHaveProperty('items');
        });

        it('should throw error for non-existent agent with helpful hint', async () => {
            await expect(
                resources.readResource('awesome://agents/non-existent-agent-xyz-123')
            ).rejects.toThrow(/Agent not found: "non-existent-agent-xyz-123".*Hint: Resource templates require an EXACT name match/s);
        });

        it('should throw error for non-existent prompt with helpful hint', async () => {
            await expect(
                resources.readResource('awesome://prompts/non-existent-prompt-xyz-123')
            ).rejects.toThrow(/Prompt not found: "non-existent-prompt-xyz-123".*Hint: Resource templates require an EXACT name match/s);
        });
    });

    describe('readResource - Search Template', () => {
        it('should search agents', async () => {
            const content = await resources.readResource('awesome://search/agents/test');

            expect(content.uri).toBe('awesome://search/agents/test');
            expect(content.mimeType).toBe('application/json');

            const result = JSON.parse(content.text);
            expect(result).toHaveProperty('query', 'test');
            expect(result).toHaveProperty('type', 'agents');
            expect(result).toHaveProperty('count');
            expect(result).toHaveProperty('results');
            expect(Array.isArray(result.results)).toBe(true);
        });

        it('should search all types', async () => {
            const content = await resources.readResource('awesome://search/all/code');

            expect(content.mimeType).toBe('application/json');

            const result = JSON.parse(content.text);
            expect(result.type).toBe('all');
            expect(result.query).toBe('code');
            expect(Array.isArray(result.results)).toBe(true);
        });

        it('should handle multi-word search queries', async () => {
            const content = await resources.readResource('awesome://search/all/code/review');

            const result = JSON.parse(content.text);
            expect(result.query).toBe('code/review');
        });
    });

    describe('readResource - Tags Template', () => {
        it('should browse resources by tag', async () => {
            const content = await resources.readResource('awesome://tags/test');

            expect(content.uri).toBe('awesome://tags/test');
            expect(content.mimeType).toBe('application/json');

            const result = JSON.parse(content.text);
            expect(result).toHaveProperty('tag', 'test');
            expect(result).toHaveProperty('totalCount');
            expect(result).toHaveProperty('agents');
            expect(result).toHaveProperty('prompts');
            expect(result).toHaveProperty('instructions');
            expect(result).toHaveProperty('skills');
            expect(result).toHaveProperty('collections');

            expect(Array.isArray(result.agents)).toBe(true);
            expect(Array.isArray(result.prompts)).toBe(true);
            expect(Array.isArray(result.instructions)).toBe(true);
            expect(Array.isArray(result.skills)).toBe(true);
            expect(Array.isArray(result.collections)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should throw error for unknown URI', async () => {
            await expect(
                resources.readResource('awesome://unknown/resource')
            ).rejects.toThrow('Unknown resource URI');
        });

        it('should throw error for invalid search URI format', async () => {
            await expect(
                resources.readResource('awesome://search/agents')
            ).rejects.toThrow('Invalid search URI format');
        });
    });
});
