#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { MCPServer } from './mcp-server';
import { GitHubAdapter } from './github-adapter';
import { HttpServer } from './http-server';
import { RepoConfig, CliOptions, ContentItem, Agent, Prompt, Instruction, Skill, Collection } from './types';
import { logger } from './logger';
import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import * as os from 'os';

const program = new Command();

program
  .name('awesome-copilot-mcp')
  .description('Model Context Protocol server for awesome-copilot agents and collections')
  .version('0.3.14');

// Global options
program
  .option('--json', 'Output in JSON format')
  .option('--refresh', 'Force refresh cache')
  .option('--verbose', 'Enable verbose logging')
  .option('--config <path>', 'Path to config file');

// Start HTTP server command
program
  .command('start-http')
  .description('Start the HTTP server (OpenAPI + streaming)')
  .option('-p, --port <number>', 'Port to listen on', (v) => parseInt(v, 10))
  .option('--host <host>', 'Host to bind', '127.0.0.1')
  .action(async (options: CliOptions & { port?: number; host?: string }) => {
    try {
      setupLogging(options);
      const config = loadConfig(options);
      const adapter = new GitHubAdapter(config);
      const server = new HttpServer(adapter, {
        port: options.port,
        host: options.host
      });
      await server.start();
      // Keep process alive
      process.stdin.resume();
    } catch (error) {
      logger.error(`Failed to start HTTP server: ${error}`);
      process.exit(1);
    }
  });

// Start MCP server command
program
  .command('start')
  .description('Start the MCP server')
  .option('--http', 'Run HTTP server instead of STDIO MCP server')
  .option('-p, --port <number>', 'Port for HTTP server', (v) => parseInt(v, 10))
  .option('--host <host>', 'Host to bind for HTTP server', '127.0.0.1')
  .action(async (options: CliOptions & { http?: boolean; port?: number; host?: string }) => {
    try {
      setupLogging(options);
      const config = loadConfig(options);

      if (options.refresh) {
        const adapter = new GitHubAdapter(config);
        adapter.clearCache();
        console.log(chalk.blue('Cache cleared'));
      }

      if (options.http) {
        const adapter = new GitHubAdapter(config);
        const httpServer = new HttpServer(adapter, {
          port: options.port,
          host: options.host,
        });
        await httpServer.start();
        // Keep process alive for HTTP server
        process.stdin.resume();
      } else {
        const server = new MCPServer(config);
        await server.start();
      }
    } catch (error) {
      logger.error(`Failed to start MCP server: ${error}`);
      process.exit(1);
    }
  });

// Debug with MCP Inspector (stdio)
program
  .command('debug')
  .description('Launch MCP Inspector with this server (stdio transport)')
  .option('--no-build', 'Skip building TypeScript before launch')
  .action(async (_options: { build?: boolean }) => {
    try {
      const shouldBuild = _options.build !== false;
      const distCli = path.resolve(process.cwd(), 'dist/cli.js');

      // Build if needed
      if (shouldBuild && !fs.existsSync(distCli)) {
        console.log(chalk.gray('Building project before launching Inspector...'));
        await new Promise<void>((resolve, reject) => {
          const p = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'build'], {
            stdio: 'inherit',
          });
          p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build exited with code ${code}`))));
        });
      }

      if (!fs.existsSync(distCli)) {
        console.error(chalk.red(`Missing ${distCli}. Run \`npm run build\` first or omit --no-build.`));
        process.exit(1);
      }

      // Launch Inspector wrapping our stdio server
      const inspectorArgs = ['-y', '@modelcontextprotocol/inspector', 'node', distCli, 'start'];
      console.log(chalk.blue('Launching MCP Inspector...'));
      console.log(chalk.gray(`> npx ${inspectorArgs.join(' ')}`));

      // Use a writable npm cache to avoid EACCES issues
      const inspectorCache = path.join(os.tmpdir(), 'npm-cache-inspector');
      await fs.ensureDir(inspectorCache);
      const child = spawn('npx', inspectorArgs, {
        stdio: 'inherit',
        env: {
          ...process.env,
          npm_config_cache: inspectorCache,
        },
      });
      child.on('exit', (code) => {
        process.exit(code ?? 0);
      });
    } catch (error) {
      logger.error(`Failed to launch Inspector: ${error}`);
      process.exit(1);
    }
  });

// Note: debug command (MCP Inspector) is defined above with --no-build option. Do not re-declare it to avoid duplicate registrations.

// Explore command
program
  .command('explore [type]')
  .description('探索可用的内容 (agents, prompts, instructions, skills, collections)')
  .option('-t, --tags <tags>', '按标签过滤 (用逗号分隔)', (value) => value.split(','))
  .option('-l, --limit <number>', '限制结果数量', parseInt)
  .action(async (type: string | undefined, options: CliOptions & { tags?: string[], limit?: number }) => {
    try {
      const globalOptions = program.opts<CliOptions>();
      const mergedOptions = { ...globalOptions, ...options };

      setupLogging(mergedOptions);
      const config = loadConfig(mergedOptions);
      const adapter = new GitHubAdapter(config);

      if (mergedOptions.refresh) {
        adapter.clearCache();
      }

      const index = await adapter.fetchIndex();
      let items: ContentItem[] = [];

      // Determine which content type to explore
      switch (type) {
        case 'agents':
          items = index.agents;
          break;
        case 'prompts':
          items = index.prompts;
          break;
        case 'instructions':
          items = index.instructions;
          break;
        case 'skills':
          items = index.skills;
          break;
        case 'collections':
          items = index.collections;
          break;
        default:
          // Show all content types
          items = [
            ...index.agents,
            ...index.prompts,
            ...index.instructions,
            ...index.skills,
            ...index.collections
          ];
          break;
      }

      // Apply filters
      if (options.tags && options.tags.length > 0) {
        items = items.filter(item =>
          options.tags!.some(tag => item.tags.includes(tag.toLowerCase()))
        );
      }

      if (options.limit) {
        items = items.slice(0, options.limit);
      }

      if (mergedOptions.json) {
        console.log(JSON.stringify(items, null, 2));
      } else {
        displayContentItems(items, type || 'all');
      }
    } catch (error) {
      logger.error(`Explore failed: ${error}`);
      console.error(chalk.red(`Explore failed: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Get content command
program
  .command('get <type> <name>')
  .description('获取特定内容的详细信息 (agent, prompt, instruction, skill, collection)')
  .action(async (type: string, name: string, options: CliOptions) => {
    try {
      const globalOptions = program.opts<CliOptions>();
      const mergedOptions = { ...globalOptions, ...options };

      setupLogging(mergedOptions);
      const config = loadConfig(mergedOptions);
      const adapter = new GitHubAdapter(config);

      if (mergedOptions.refresh) {
        adapter.clearCache();
      }

      const index = await adapter.fetchIndex();
      let item: ContentItem | undefined;

      switch (type) {
        case 'agent':
          item = index.agents.find(a => a.name === name);
          break;
        case 'prompt':
          item = index.prompts.find(p => p.name === name);
          break;
        case 'instruction':
          item = index.instructions.find(i => i.name === name);
          break;
        case 'skill':
          item = index.skills.find(s => s.name === name);
          break;
        case 'collection':
          item = index.collections.find(c => c.name === name);
          break;
        default:
          console.error(chalk.red(`Unknown content type: ${type}`));
          process.exit(1);
      }

      if (!item) {
        console.error(chalk.red(`${type} '${name}' not found`));
        process.exit(1);
      }

      if (mergedOptions.json) {
        console.log(JSON.stringify(item, null, 2));
      } else {
        await displayContentItemDetail(item, adapter);
      }
    } catch (error) {
      logger.error(`Get ${type} failed: ${error}`);
      console.error(chalk.red(`Get ${type} failed: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Search command
program
  .command('search <query>')
  .description('在所有内容中搜索')
  .option('-t, --type <type>', '内容类型 (agents, prompts, instructions, skills, collections, all)', 'all')
  .option('--tags <tags>', '按标签过滤 (用逗号分隔)', (value) => value.split(','))
  .option('-l, --limit <number>', '限制结果数量', parseInt)
  .action(async (query: string, options: CliOptions & { type?: string, tags?: string[], limit?: number }) => {
    try {
      const globalOptions = program.opts<CliOptions>();
      const mergedOptions = { ...globalOptions, ...options };

      setupLogging(mergedOptions);
      const config = loadConfig(mergedOptions);
      const adapter = new GitHubAdapter(config);

      if (mergedOptions.refresh) {
        adapter.clearCache();
      }

      const index = await adapter.fetchIndex();
      let items: ContentItem[] = [];

      // Determine which content types to search
      switch (options.type) {
        case 'agents':
          items = index.agents;
          break;
        case 'prompts':
          items = index.prompts;
          break;
        case 'instructions':
          items = index.instructions;
          break;
        case 'skills':
          items = index.skills;
          break;
        case 'collections':
          items = index.collections;
          break;
        case 'all':
        default:
          items = [
            ...index.agents,
            ...index.prompts,
            ...index.instructions,
            ...index.skills,
            ...index.collections
          ];
          break;
      }

      // Text search
      const searchQuery = query.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery) ||
        item.tags.some(tag => tag.includes(searchQuery))
      );

      // Tag filtering
      if (options.tags && options.tags.length > 0) {
        items = items.filter(item =>
          options.tags!.some(tag => item.tags.includes(tag.toLowerCase()))
        );
      }

      // Limit results
      if (mergedOptions.limit) {
        items = items.slice(0, mergedOptions.limit);
      }

      if (mergedOptions.json) {
        console.log(JSON.stringify({
          query: query,
          count: items.length,
          items: items.map(item => ({
            name: item.name,
            description: item.description,
            type: item.type,
            tags: item.tags || [],
            path: item.path,
            url: item.url
          }))
        }, null, 2));
      } else {
        displayContentItems(items, mergedOptions.type || 'all', query);
      }
    } catch (error) {
      logger.error(`Search failed: ${error}`);
      console.error(chalk.red(`Search failed: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Recommend command
program
  .command('recommend <description>')
  .description('根据描述推荐相关的内容')
  .option('-t, --type <type>', '内容类型 (agents, prompts, instructions, skills, collections, all)', 'all')
  .option('-l, --limit <number>', '限制推荐数量', parseInt)
  .action(async (description: string, options: CliOptions & { type?: string, limit?: number }) => {
    try {
      const globalOptions = program.opts<CliOptions>();
      const mergedOptions = { ...globalOptions, ...options };

      setupLogging(mergedOptions);
      const config = loadConfig(mergedOptions);
      const adapter = new GitHubAdapter(config);

      if (mergedOptions.refresh) {
        adapter.clearCache();
      }

      const index = await adapter.fetchIndex();
      let items: ContentItem[] = [];

      // Determine which content types to recommend from
      switch (options.type) {
        case 'agents':
          items = index.agents;
          break;
        case 'prompts':
          items = index.prompts;
          break;
        case 'instructions':
          items = index.instructions;
          break;
        case 'skills':
          items = index.skills;
          break;
        case 'collections':
          items = index.collections;
          break;
        case 'all':
        default:
          items = [
            ...index.agents,
            ...index.prompts,
            ...index.instructions,
            ...index.skills,
            ...index.collections
          ];
          break;
      }

      // Simple recommendation based on description matching
      const descWords = description.toLowerCase().split(/\s+/);
      const recommendations = items
        .map(item => {
          const score = descWords.reduce((acc, word) => {
            const nameMatch = item.name.toLowerCase().includes(word) ? 3 : 0;
            const descMatch = item.description.toLowerCase().includes(word) ? 2 : 0;
            const tagMatch = item.tags.some(tag => tag.includes(word)) ? 1 : 0;
            return acc + nameMatch + descMatch + tagMatch;
          }, 0);
          return { item, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, mergedOptions.limit || 10)
        .map(result => result.item);

      if (mergedOptions.json) {
        console.log(JSON.stringify(recommendations, null, 2));
      } else {
        displayRecommendations(recommendations, description, mergedOptions.type || 'all');
      }
    } catch (error) {
      logger.error(`Recommend failed: ${error}`);
      console.error(chalk.red(`Recommend failed: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Helper functions

function setupLogging(options: CliOptions): void {
  if (options.verbose) {
    logger.level = 'debug';
  }
}

function loadConfig(options: CliOptions): RepoConfig {
  let config: RepoConfig = {
    owner: 'github',
    repo: 'awesome-copilot',
    branch: 'main'
  };

  // Load from custom config file
  if (options.config) {
    try {
      const configPath = path.resolve(options.config);
      const customConfig = fs.readJsonSync(configPath);
      config = { ...config, ...customConfig };
    } catch (error) {
      logger.warn(`Failed to load config file: ${error}`);
    }
  }

  // Load from environment JSON
  if (process.env.ACP_REPOS_JSON) {
    try {
      const envConfig = JSON.parse(process.env.ACP_REPOS_JSON);
      config = { ...config, ...envConfig };
    } catch (error) {
      logger.warn(`Failed to parse ACP_REPOS_JSON: ${error}`);
    }
  }

  // Load Metadata URL from env
  if (process.env.ACP_METADATA_URL) {
    config.metadataUrl = process.env.ACP_METADATA_URL;
  }

  return config;
}

function displayContentItems(items: ContentItem[], type: string, query?: string): void {
  const typeNames = {
    agents: 'AI助手',
    prompts: '提示词',
    instructions: '指令',
    skills: '技能',
    collections: '工具包集合',
    all: '内容'
  };

  const typeName = typeNames[type as keyof typeof typeNames] || '内容';

  if (query) {
    console.log(chalk.blue(`\n搜索 "${query}" 的${typeName}结果:\n`));
  } else {
    console.log(chalk.blue(`\n可用的${typeName}:\n`));
  }

  items.forEach((item: ContentItem) => {
    const icon = getTypeIcon(item.type);
    console.log(`${icon} ${chalk.cyan(item.name)}: ${item.description}`);
    if (item.tags && item.tags.length > 0) {
      console.log(`  标签: ${item.tags.join(', ')}`);
    }
    if (item.type === 'collection') {
      console.log(`  项目数量: ${(item as Collection).items.length}`);
    }
    console.log('');
  });
}

async function displayContentItemDetail(item: ContentItem, adapter?: GitHubAdapter): Promise<void> {
  const typeNames = {
    agent: 'AI助手',
    prompt: '提示词',
    instruction: '指令',
    skill: '技能',
    collection: '工具包集合'
  };

  const typeName = typeNames[item.type] || '内容';

  console.log(chalk.blue(`\n${typeName}: ${item.name}\n`));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`${item.description}\n`);
  console.log(`标签: ${item.tags.join(', ')}\n`);

  if (item.type === 'collection') {
    const collection = item as Collection;
    console.log(`包含的项目 (${collection.items.length}个):\n`);
    collection.items.forEach((collectionItem, index) => {
      if (typeof collectionItem === 'object' && collectionItem.path) {
        console.log(`  ${index + 1}. [${collectionItem.kind}] ${collectionItem.path}`);
      } else {
        console.log(`  ${index + 1}. ${collectionItem}`);
      }
    });
    console.log('');
  }

  // Show files for skills
  if (item.type === 'skill' && (item as Skill).files) {
    const skill = item as Skill;
    console.log(`包含的文件 (${skill.files!.length}个):\n`);
    skill.files!.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    console.log('');
  }

  console.log(chalk.gray('─'.repeat(50)));
  // Show download URL instead of content
  console.log(chalk.cyan('Download URL:'));
  console.log(chalk.white(item.url));
  console.log('');
  console.log(chalk.gray(`Use the URL above to download the file directly.`));
  console.log(chalk.gray('─'.repeat(50)));
}

function displayRecommendations(recommendations: ContentItem[], description: string, type: string): void {
  const typeNames = {
    agents: 'AI助手',
    prompts: '提示词',
    instructions: '指令',
    skills: '技能',
    collections: '工具包集合',
    all: '内容'
  };

  const typeName = typeNames[type as keyof typeof typeNames] || '内容';

  console.log(chalk.blue(`\n根据描述 "${description}" 的推荐${typeName}:\n`));

  recommendations.forEach((item: ContentItem, index: number) => {
    const icon = getTypeIcon(item.type);
    console.log(`${index + 1}. ${icon} ${chalk.cyan(item.name)}: ${item.description}`);
    if (item.tags && item.tags.length > 0) {
      console.log(`   标签: ${item.tags.join(', ')}`);
    }
    if (item.type === 'collection') {
      console.log(`   项目数量: ${(item as Collection).items.length}`);
    }
    console.log('');
  });
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'agent': return '🤖';
    case 'prompt': return '💬';
    case 'instruction': return '📋';
    case 'skill': return '🛠️';
    case 'collection': return '📦';
    default: return '📄';
  }
}

program.parse();