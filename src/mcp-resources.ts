import { Resource, ResourceTemplate } from '@modelcontextprotocol/sdk/types.js';
import { GitHubAdapter } from './github-adapter';
import { logger } from './logger';

export interface ResourceContent {
    uri: string;
    mimeType: string;
    text: string;
}

export class MCPResources {
    private adapter: GitHubAdapter;

    constructor(adapter: GitHubAdapter) {
        this.adapter = adapter;
    }

    /**
     * Lists all available direct resources (fixed URIs)
     */
    async getResources(): Promise<Resource[]> {
        return [
            {
                uri: 'awesome://metadata',
                name: 'Complete Metadata Index',
                description: 'Full index of all agents, prompts, instructions, skills, and collections',
                mimeType: 'application/json'
            },
            {
                uri: 'awesome://agents/index',
                name: 'Agents Index',
                description: 'List of all available AI agents',
                mimeType: 'application/json'
            },
            {
                uri: 'awesome://prompts/index',
                name: 'Prompts Index',
                description: 'List of all available prompts',
                mimeType: 'application/json'
            },
            {
                uri: 'awesome://instructions/index',
                name: 'Instructions Index',
                description: 'List of all available instructions',
                mimeType: 'application/json'
            },
            {
                uri: 'awesome://skills/index',
                name: 'Skills Index',
                description: 'List of all available skills',
                mimeType: 'application/json'
            },
            {
                uri: 'awesome://collections/index',
                name: 'Collections Index',
                description: 'List of all available collections',
                mimeType: 'application/json'
            }
        ];
    }

    /**
     * Lists all available resource templates (URIs with parameters)
     */
    async getResourceTemplates(): Promise<ResourceTemplate[]> {
        return [
            {
                uriTemplate: 'awesome://agents/{name}',
                name: 'agent-info',
                description: 'Get metadata and download URL for a specific agent by name',
                mimeType: 'application/json'
            },
            {
                uriTemplate: 'awesome://prompts/{name}',
                name: 'prompt-info',
                description: 'Get metadata and download URL for a specific prompt by name',
                mimeType: 'application/json'
            },
            {
                uriTemplate: 'awesome://instructions/{name}',
                name: 'instruction-info',
                description: 'Get metadata and download URL for a specific instruction by name',
                mimeType: 'application/json'
            },
            {
                uriTemplate: 'awesome://skills/{name}',
                name: 'skill-info',
                description: 'Get metadata and download URL for a specific skill by name',
                mimeType: 'application/json'
            },
            {
                uriTemplate: 'awesome://collections/{name}',
                name: 'collection-info',
                description: 'Get metadata for a specific collection by name',
                mimeType: 'application/json'
            },
            {
                uriTemplate: 'awesome://search/{type}/{query}',
                name: 'search-resources',
                description: 'Search resources by type (agents/prompts/instructions/skills/collections/all) and query',
                mimeType: 'application/json'
            },
            {
                uriTemplate: 'awesome://tags/{tag}',
                name: 'browse-by-tag',
                description: 'Browse all resources with a specific tag',
                mimeType: 'application/json'
            }
        ];
    }

    /**
     * Reads the content of a resource by its URI
     */
    async readResource(uri: string): Promise<ResourceContent> {
        try {
            logger.info(`Reading resource: ${uri}`);

            // Handle metadata
            if (uri === 'awesome://metadata') {
                return await this.readMetadata();
            }

            // Handle index resources
            if (uri === 'awesome://agents/index') {
                return await this.readAgentsIndex();
            }
            if (uri === 'awesome://prompts/index') {
                return await this.readPromptsIndex();
            }
            if (uri === 'awesome://instructions/index') {
                return await this.readInstructionsIndex();
            }
            if (uri === 'awesome://skills/index') {
                return await this.readSkillsIndex();
            }
            if (uri === 'awesome://collections/index') {
                return await this.readCollectionsIndex();
            }

            // Handle template resources
            if (uri.startsWith('awesome://agents/')) {
                return await this.readAgentByName(uri);
            }
            if (uri.startsWith('awesome://prompts/')) {
                return await this.readPromptByName(uri);
            }
            if (uri.startsWith('awesome://instructions/')) {
                return await this.readInstructionByName(uri);
            }
            if (uri.startsWith('awesome://skills/')) {
                return await this.readSkillByName(uri);
            }
            if (uri.startsWith('awesome://collections/')) {
                return await this.readCollectionByName(uri);
            }
            if (uri.startsWith('awesome://search/')) {
                return await this.readSearchResults(uri);
            }
            if (uri.startsWith('awesome://tags/')) {
                return await this.readResourcesByTag(uri);
            }

            throw new Error(`Unknown resource URI: ${uri}`);
        } catch (error) {
            logger.error(`Failed to read resource ${uri}: ${error}`);
            throw error;
        }
    }

    // Private helper methods for reading specific resources

    private async readMetadata(): Promise<ResourceContent> {
        const index = await this.adapter.fetchIndex();
        return {
            uri: 'awesome://metadata',
            mimeType: 'application/json',
            text: JSON.stringify(index, null, 2)
        };
    }

    private async readAgentsIndex(): Promise<ResourceContent> {
        const index = await this.adapter.fetchIndex();
        const agentsList = index.agents.map(agent => ({
            name: agent.name,
            description: agent.description,
            tags: agent.tags,
            path: agent.path,
            url: agent.url
        }));
        return {
            uri: 'awesome://agents/index',
            mimeType: 'application/json',
            text: JSON.stringify(agentsList, null, 2)
        };
    }

    private async readPromptsIndex(): Promise<ResourceContent> {
        const index = await this.adapter.fetchIndex();
        const promptsList = index.prompts.map(prompt => ({
            name: prompt.name,
            description: prompt.description,
            tags: prompt.tags,
            path: prompt.path,
            url: prompt.url
        }));
        return {
            uri: 'awesome://prompts/index',
            mimeType: 'application/json',
            text: JSON.stringify(promptsList, null, 2)
        };
    }

    private async readInstructionsIndex(): Promise<ResourceContent> {
        const index = await this.adapter.fetchIndex();
        const instructionsList = index.instructions.map(instruction => ({
            name: instruction.name,
            description: instruction.description,
            tags: instruction.tags,
            path: instruction.path,
            url: instruction.url
        }));
        return {
            uri: 'awesome://instructions/index',
            mimeType: 'application/json',
            text: JSON.stringify(instructionsList, null, 2)
        };
    }

    private async readSkillsIndex(): Promise<ResourceContent> {
        const index = await this.adapter.fetchIndex();
        const skillsList = index.skills.map(skill => ({
            name: skill.name,
            description: skill.description,
            tags: skill.tags,
            path: skill.path,
            url: skill.url
        }));
        return {
            uri: 'awesome://skills/index',
            mimeType: 'application/json',
            text: JSON.stringify(skillsList, null, 2)
        };
    }

    private async readCollectionsIndex(): Promise<ResourceContent> {
        const index = await this.adapter.fetchIndex();
        const collectionsList = index.collections.map(collection => ({
            name: collection.name,
            description: collection.description,
            tags: collection.tags,
            items: collection.items,
            path: collection.path,
            url: collection.url
        }));
        return {
            uri: 'awesome://collections/index',
            mimeType: 'application/json',
            text: JSON.stringify(collectionsList, null, 2)
        };
    }

    private async readAgentByName(uri: string): Promise<ResourceContent> {
        const name = uri.replace('awesome://agents/', '');
        const index = await this.adapter.fetchIndex();
        const agent = index.agents.find(a => a.name === name);

        if (!agent) {
            throw new Error(`Agent not found: "${name}". \nHint: Resource templates require an EXACT name match. If you are unsure of the name, use "awesome://search/agents/${name}" to search, or check "awesome://agents/index" for a full list of available agents.`);
        }

        // Return URL for direct download instead of content
        return {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ name: agent.name, type: agent.type, url: agent.url, path: agent.path, description: agent.description })
        };
    }

    private async readPromptByName(uri: string): Promise<ResourceContent> {
        const name = uri.replace('awesome://prompts/', '');
        const index = await this.adapter.fetchIndex();
        const prompt = index.prompts.find(p => p.name === name);

        if (!prompt) {
            throw new Error(`Prompt not found: "${name}". \nHint: Resource templates require an EXACT name match. If you are unsure of the name, use "awesome://search/prompts/${name}" to search, or check "awesome://prompts/index" for a full list of available prompts.`);
        }

        // Return URL for direct download instead of content
        return {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ name: prompt.name, type: prompt.type, url: prompt.url, path: prompt.path, description: prompt.description })
        };
    }

    private async readInstructionByName(uri: string): Promise<ResourceContent> {
        const name = uri.replace('awesome://instructions/', '');
        const index = await this.adapter.fetchIndex();
        const instruction = index.instructions.find(i => i.name === name);

        if (!instruction) {
            throw new Error(`Instruction not found: "${name}". \nHint: Resource templates require an EXACT name match. If you are unsure of the name, use "awesome://search/instructions/${name}" to search, or check "awesome://instructions/index" for a full list of available instructions.`);
        }

        // Return URL for direct download instead of content
        return {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ name: instruction.name, type: instruction.type, url: instruction.url, path: instruction.path, description: instruction.description })
        };
    }

    private async readSkillByName(uri: string): Promise<ResourceContent> {
        const name = uri.replace('awesome://skills/', '');
        const index = await this.adapter.fetchIndex();
        const skill = index.skills.find(s => s.name === name);

        if (!skill) {
            throw new Error(`Skill not found: "${name}". \nHint: Resource templates require an EXACT name match. If you are unsure of the name, use "awesome://search/skills/${name}" to search, or check "awesome://skills/index" for a full list of available skills.`);
        }

        // Return URL for direct download instead of content
        return {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ name: skill.name, type: skill.type, url: skill.url, path: skill.path, description: skill.description })
        };
    }

    private async readCollectionByName(uri: string): Promise<ResourceContent> {
        const name = uri.replace('awesome://collections/', '');
        const index = await this.adapter.fetchIndex();
        const collection = index.collections.find(c => c.name === name);

        if (!collection) {
            throw new Error(`Collection not found: "${name}". \nHint: Resource templates require an EXACT name match. If you are unsure of the name, use "awesome://search/collections/${name}" to search, or check "awesome://collections/index" for a full list of available collections.`);
        }

        return {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(collection, null, 2)
        };
    }

    private async readSearchResults(uri: string): Promise<ResourceContent> {
        // Parse URI: awesome://search/{type}/{query}
        const parts = uri.replace('awesome://search/', '').split('/');
        if (parts.length < 2) {
            throw new Error('Invalid search URI format. Expected: awesome://search/{type}/{query}');
        }

        const type = parts[0];
        const query = parts.slice(1).join('/').toLowerCase();
        const index = await this.adapter.fetchIndex();

        const results: any[] = [];

        // Search based on type
        if (type === 'agents' || type === 'all') {
            const agentResults = index.agents.filter(agent =>
                agent.name.toLowerCase().includes(query) ||
                agent.description.toLowerCase().includes(query) ||
                agent.tags.some(tag => tag.toLowerCase().includes(query))
            );
            results.push(...agentResults);
        }

        if (type === 'prompts' || type === 'all') {
            const promptResults = index.prompts.filter(prompt =>
                prompt.name.toLowerCase().includes(query) ||
                prompt.description.toLowerCase().includes(query) ||
                prompt.tags.some(tag => tag.toLowerCase().includes(query))
            );
            results.push(...promptResults);
        }

        if (type === 'instructions' || type === 'all') {
            const instructionResults = index.instructions.filter(instruction =>
                instruction.name.toLowerCase().includes(query) ||
                instruction.description.toLowerCase().includes(query) ||
                instruction.tags.some(tag => tag.toLowerCase().includes(query))
            );
            results.push(...instructionResults);
        }

        if (type === 'skills' || type === 'all') {
            const skillResults = index.skills.filter(skill =>
                skill.name.toLowerCase().includes(query) ||
                skill.description.toLowerCase().includes(query) ||
                skill.tags.some(tag => tag.toLowerCase().includes(query))
            );
            results.push(...skillResults);
        }

        if (type === 'collections' || type === 'all') {
            const collectionResults = index.collections.filter(collection =>
                collection.name.toLowerCase().includes(query) ||
                collection.description.toLowerCase().includes(query) ||
                collection.tags.some(tag => tag.toLowerCase().includes(query))
            );
            results.push(...collectionResults);
        }

        return {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
                query,
                type,
                count: results.length,
                results
            }, null, 2)
        };
    }

    private async readResourcesByTag(uri: string): Promise<ResourceContent> {
        // Parse URI: awesome://tags/{tag}
        const tag = uri.replace('awesome://tags/', '').toLowerCase();
        const index = await this.adapter.fetchIndex();

        const results = {
            tag,
            agents: index.agents.filter(a => a.tags.some(t => t.toLowerCase() === tag)),
            prompts: index.prompts.filter(p => p.tags.some(t => t.toLowerCase() === tag)),
            instructions: index.instructions.filter(i => i.tags.some(t => t.toLowerCase() === tag)),
            skills: index.skills.filter(s => s.tags.some(t => t.toLowerCase() === tag)),
            collections: index.collections.filter(c => c.tags.some(t => t.toLowerCase() === tag))
        };

        const totalCount = results.agents.length + results.prompts.length +
            results.instructions.length + results.skills.length +
            results.collections.length;

        return {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
                tag,
                totalCount,
                agents: results.agents,
                prompts: results.prompts,
                instructions: results.instructions,
                skills: results.skills,
                collections: results.collections
            }, null, 2)
        };
    }
}
