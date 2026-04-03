import { describe, it, expect } from 'vitest';
import { Agent, Collection, RepoConfig, IndexData, SearchOptions, LoadOptions, CliOptions, CacheEntry, Prompt, Instruction, Skill, Plugin, Hook, Workflow } from '../src/types';

describe('Types', () => {
  it('should define Agent interface', () => {
    const agent: Agent = {
      name: 'test-agent',
      description: 'Test agent',
      tags: ['test'],
      path: 'agents/test.agent.md',
      url: 'https://github.com/test/test',
      type: 'agent'
    };

    expect(agent.name).toBe('test-agent');
    expect(agent.tags).toContain('test');
    expect(agent.type).toBe('agent');
  });

  it('should define Prompt interface', () => {
    const prompt: Prompt = {
      name: 'test-prompt',
      description: 'Test prompt',
      tags: ['test'],
      path: 'prompts/test.prompt.md',
      url: 'https://github.com/test/test',
      type: 'prompt'
    };

    expect(prompt.name).toBe('test-prompt');
    expect(prompt.type).toBe('prompt');
  });

  it('should define Instruction interface', () => {
    const instruction: Instruction = {
      name: 'test-instruction',
      description: 'Test instruction',
      tags: ['test'],
      path: 'instructions/test.instructions.md',
      url: 'https://github.com/test/test',
      type: 'instruction'
    };

    expect(instruction.name).toBe('test-instruction');
    expect(instruction.type).toBe('instruction');
  });

  it('should define Skill interface', () => {
    const skill: Skill = {
      name: 'test-skill',
      description: 'Test skill',
      tags: ['test'],
      path: 'skills/test-skill',
      url: 'https://github.com/test/test',
      type: 'skill'
    };

    expect(skill.name).toBe('test-skill');
    expect(skill.type).toBe('skill');
  });

  it('should define Plugin interface', () => {
    const plugin: Plugin = {
      name: 'test-plugin',
      description: 'Test plugin',
      tags: ['test'],
      path: 'plugins/test-plugin',
      url: 'https://github.com/test/plugin',
      type: 'plugin',
      version: '1.0.0'
    };

    expect(plugin.name).toBe('test-plugin');
    expect(plugin.type).toBe('plugin');
  });

  it('should define Hook interface', () => {
    const hook: Hook = {
      name: 'test-hook',
      description: 'Test hook',
      tags: ['test'],
      path: 'hooks/test-hook/README.md',
      url: 'https://github.com/test/hook',
      type: 'hook'
    };

    expect(hook.name).toBe('test-hook');
    expect(hook.type).toBe('hook');
  });

  it('should define Workflow interface', () => {
    const workflow: Workflow = {
      name: 'test-workflow',
      description: 'Test workflow',
      tags: ['test'],
      path: 'workflows/test-workflow.md',
      url: 'https://github.com/test/workflow',
      type: 'workflow'
    };

    expect(workflow.name).toBe('test-workflow');
    expect(workflow.type).toBe('workflow');
  });

  it('should define Collection interface', () => {
    const collection: Collection = {
      id: 'test-collection',
      name: 'test-collection',
      description: 'Test collection',
      tags: ['test'],
      items: [
        { path: 'agent1.md', kind: 'agent' },
        { path: 'agent2.md', kind: 'agent' }
      ],
      path: 'collections/test.md',
      url: 'https://github.com/test/test',
      type: 'collection'
    };

    expect(collection.name).toBe('test-collection');
    expect(collection.items).toHaveLength(2);
    expect(collection.type).toBe('collection');
  });

  it('should define RepoConfig interface', () => {
    const config: RepoConfig = {
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main',
      token: 'test-token'
    };

    expect(config.owner).toBe('test-owner');
    expect(config.token).toBe('test-token');
  });

  it('should define IndexData interface', () => {
    const indexData: IndexData = {
      agents: [],
      prompts: [],
      instructions: [],
      skills: [],
      collections: [],
      plugins: [],
      hooks: [],
      workflows: [],
      lastUpdated: '2024-01-01T00:00:00Z'
    };

    expect(indexData.agents).toHaveLength(0);
    expect(indexData.lastUpdated).toBeDefined();
  });

  it('should define SearchOptions interface', () => {
    const options: SearchOptions = {
      query: 'test',
      type: 'agents',
      tags: ['test'],
      limit: 10
    };

    expect(options.query).toBe('test');
    expect(options.limit).toBe(10);

    // Test all content types
    const allTypes: SearchOptions = {
      query: 'test',
      type: 'all'
    };

    expect(allTypes.type).toBe('all');

    const pluginType: SearchOptions = {
      query: 'plugin',
      type: 'plugins'
    };
    expect(pluginType.type).toBe('plugins');
  });

  it('should define LoadOptions interface', () => {
    const options: LoadOptions = {
      name: 'test-agent',
      type: 'agent',
      refresh: true
    };

    expect(options.name).toBe('test-agent');
    expect(options.refresh).toBe(true);

    // Test all content types
    const promptOptions: LoadOptions = {
      name: 'test-prompt',
      type: 'prompt'
    };

    const instructionOptions: LoadOptions = {
      name: 'test-instruction',
      type: 'instruction'
    };

    const skillOptions: LoadOptions = {
      name: 'test-skill',
      type: 'skill'
    };

    const collectionOptions: LoadOptions = {
      name: 'test-collection',
      type: 'collection'
    };

    const pluginOptions: LoadOptions = {
      name: 'test-plugin',
      type: 'plugin'
    };

    const hookOptions: LoadOptions = {
      name: 'test-hook',
      type: 'hook'
    };

    const workflowOptions: LoadOptions = {
      name: 'test-workflow',
      type: 'workflow'
    };

    expect(promptOptions.type).toBe('prompt');
    expect(instructionOptions.type).toBe('instruction');
    expect(skillOptions.type).toBe('skill');
    expect(collectionOptions.type).toBe('collection');
    expect(pluginOptions.type).toBe('plugin');
    expect(hookOptions.type).toBe('hook');
    expect(workflowOptions.type).toBe('workflow');
  });

  it('should define CliOptions interface', () => {
    const options: CliOptions = {
      json: true,
      refresh: false,
      verbose: true,
      config: 'config.json'
    };

    expect(options.json).toBe(true);
    expect(options.verbose).toBe(true);
  });

  it('should define CacheEntry interface', () => {
    const entry: CacheEntry = {
      data: { test: 'data' },
      timestamp: Date.now(),
      ttl: 3600
    };

    expect(entry.data.test).toBe('data');
    expect(entry.ttl).toBe(3600);
  });
});
