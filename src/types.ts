export interface Agent {
  name: string;
  description: string;
  tags: string[];
  // content: string; // Removed - fetched on demand
  path: string;
  url: string;
  type: 'agent';
}

export interface Prompt {
  name: string;
  description: string;
  tags: string[];
  // content: string; // Removed - fetched on demand
  path: string;
  url: string;
  type: 'prompt';
}

export interface Instruction {
  name: string;
  description: string;
  tags: string[];
  // content: string; // Removed - fetched on demand
  path: string;
  url: string;
  type: 'instruction';
}

export interface Skill {
  name: string;
  description: string;
  tags: string[];
  // content: string; // Removed - fetched on demand
  path: string;
  files?: string[];  // all files in skill directory (relative paths)
  url: string;
  type: 'skill';
}

export interface CollectionItem {
  path: string;
  kind: 'prompt' | 'instruction' | 'agent' | 'skill';
}

export interface CollectionDisplay {
  ordering?: 'alpha' | 'manual';
  show_badge?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  tags: string[];
  items: CollectionItem[];
  display?: CollectionDisplay;
  path: string;
  url: string;
  type: 'collection';
}

export interface PluginAuthor {
  name?: string;
  url?: string;
}

export interface PluginSource {
  source?: string;
  repo?: string;
  path?: string;
  url?: string;
}

export interface Plugin {
  name: string;
  description: string;
  tags: string[];
  version?: string;
  author?: PluginAuthor;
  homepage?: string;
  repository?: string;
  license?: string;
  source?: PluginSource;
  path: string;
  url: string;
  type: 'plugin';
}

export interface Hook {
  name: string;
  description: string;
  tags: string[];
  path: string;
  files?: string[];
  url: string;
  type: 'hook';
}

export interface Workflow {
  name: string;
  description: string;
  tags: string[];
  path: string;
  url: string;
  type: 'workflow';
}

export type ContentItem = Agent | Prompt | Instruction | Skill | Collection | Plugin | Hook | Workflow;

export interface RepoConfig {
  owner: string;
  repo: string;
  branch?: string;
  token?: string;
  metadataUrl?: string; // Hosted metadata URL or local metadata.json path
}

export interface IndexData {
  agents: Agent[];
  prompts: Prompt[];
  instructions: Instruction[];
  skills: Skill[];
  collections: Collection[];
  plugins: Plugin[];
  hooks: Hook[];
  workflows: Workflow[];
  lastUpdated: string;
  version?: string;
  generatedAt?: string;
  source?: string;
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export interface SearchOptions {
  query: string;
  type?: 'agents' | 'prompts' | 'instructions' | 'skills' | 'collections' | 'plugins' | 'hooks' | 'workflows' | 'all';
  tags?: string[];
  limit?: number;
}

export interface LoadOptions {
  name: string;
  type: 'agent' | 'prompt' | 'instruction' | 'skill' | 'collection' | 'plugin' | 'hook' | 'workflow';
  refresh?: boolean;
}

export interface CliOptions {
  json?: boolean;
  refresh?: boolean;
  verbose?: boolean;
  config?: string;
}
