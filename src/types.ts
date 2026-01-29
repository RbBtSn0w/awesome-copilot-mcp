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

export type ContentItem = Agent | Prompt | Instruction | Skill | Collection;

export interface RepoConfig {
  owner: string;
  repo: string;
  branch?: string;
  token?: string;
  metadataUrl?: string; // URL to hosted metadata.json (e.g., GitHub Pages)
}

export interface IndexData {
  agents: Agent[];
  prompts: Prompt[];
  instructions: Instruction[];
  skills: Skill[];
  collections: Collection[];
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
  type?: 'agents' | 'prompts' | 'instructions' | 'skills' | 'collections' | 'all';
  tags?: string[];
  limit?: number;
}

export interface LoadOptions {
  name: string;
  type: 'agent' | 'prompt' | 'instruction' | 'skill' | 'collection';
  refresh?: boolean;
}

export interface CliOptions {
  json?: boolean;
  refresh?: boolean;
  verbose?: boolean;
  config?: string;
}