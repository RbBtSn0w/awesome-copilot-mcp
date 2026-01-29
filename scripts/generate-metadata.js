#!/usr/bin/env node

/**
 * Metadata Generation Script
 * Scans github/awesome-copilot repository and generates a metadata.json snapshot.
 * Usage: node scripts/generate-metadata.js [--output path/to/metadata.json] [--verify] [--check-updates]
 * 
 * Optimization: Fetches the git tree ONCE to minimize API usage.
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const os = require('os');

const GITHUB_OWNER = 'github';
const GITHUB_REPO = 'awesome-copilot';
const GITHUB_BRANCH = 'main';
const DEFAULT_OUTPUT = path.join(__dirname, '..', 'metadata.json');

// Parse command line arguments
const args = process.argv.slice(2);
let outputPath = DEFAULT_OUTPUT;
let verifyOnly = false;
let checkUpdates = false;
let localRepoPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' && args[i + 1]) {
    outputPath = args[++i];
  } else if (args[i] === '--local-repo' && args[i + 1]) {
    localRepoPath = args[++i];
  } else if (args[i] === '--verify') {
    verifyOnly = true;
  } else if (args[i] === '--check-updates') {
    checkUpdates = true;
  }
}

// Support GITHUB_TOKEN if standard environment variable is present (Optional)
const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'awesome-copilot-mcp/1.0.0'
};

if (process.env.GITHUB_TOKEN) {
  headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
}

const client = axios.create({
  headers,
  timeout: 10000
});

async function fetchFile(filePath) {
  if (localRepoPath) {
    try {
      const fullPath = path.join(localRepoPath, filePath);
      if (await fs.pathExists(fullPath)) {
        return await fs.readFile(fullPath, 'utf8');
      }
      return null;
    } catch (error) {
      console.warn(`Failed to read local file ${filePath}: ${error.message}`);
      return null;
    }
  }

  // Use raw.githubusercontent.com for file content to save API rate limits
  // Note: raw.githubusercontent.com usually doesn't need token, but private repos would.
  // For this public repo, we proceed without token to avoid passing it to a different domain if not needed,
  // or we can use the API blob endpoint if we wanted strictly to stay on API.
  // Sticking to raw.githubusercontent.com for content is generally better for limits.
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
  try {
    const response = await client.get(url);
    return response.data;
  } catch (error) {
    console.warn(`Failed to fetch ${filePath}: ${error.message}`);
    return null;
  }
}

function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') {
    return { frontmatter: {}, body: content };
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line === '---');
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterStr = lines.slice(1, endIndex).join('\n');
  const body = lines.slice(endIndex + 1).join('\n');

  try {
    const frontmatter = yaml.load(frontmatterStr) || {};
    return { frontmatter, body };
  } catch (error) {
    console.warn(`Failed to parse YAML frontmatter: ${error.message}`);
    return { frontmatter: {}, body: content };
  }
}

// Recursive function to walk local directory
async function walkDir(dir, prefix = '') {
  let results = [];
  const list = await fs.readdir(dir);

  for (const file of list) {
    // Ignore .git and other hidden files
    if (file.startsWith('.')) continue;

    const fullPath = path.join(dir, file);
    const relativePath = path.join(prefix, file);
    const stat = await fs.stat(fullPath);

    if (stat && stat.isDirectory()) {
      results = results.concat(await walkDir(fullPath, relativePath));
    } else {
      results.push({
        path: relativePath,
        type: 'blob'
      });
    }
  }
  return results;
}

// Fetch the entire repository tree structure in ONE call (or locally)
async function fetchRepoTree() {
  if (localRepoPath) {
    console.log(`Scanning local repository at: ${localRepoPath}`);
    const repoUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`;

    try {
      if (!await fs.pathExists(localRepoPath)) {
        console.log(`Local repository not found. Cloning (shallow) from ${repoUrl}...`);
        try {
          // Shallow clone, single branch for performance
          execSync(`git clone --depth 1 --branch ${GITHUB_BRANCH} --single-branch ${repoUrl} "${localRepoPath}"`, { stdio: 'inherit' });
        } catch (cloneError) {
          throw new Error(`Failed to clone repository: ${cloneError.message}`);
        }
      } else {
        console.log('Local repository exists. Updating (fetch & reset)...');
        try {
          // Check if it's a valid git repo
          const isGit = fs.pathExistsSync(path.join(localRepoPath, '.git'));
          if (isGit) {
            // Fetch only latest commits for the specific branch
            execSync(`git -C "${localRepoPath}" fetch origin ${GITHUB_BRANCH} --depth 1`, { stdio: 'inherit' });
            // Hard reset to match remote state (safest mechanism for cache/mirror usage)
            execSync(`git -C "${localRepoPath}" reset --hard origin/${GITHUB_BRANCH}`, { stdio: 'inherit' });
          } else {
            console.warn('Directory exists but is not a git repository. Skipping git update.');
          }
        } catch (pullError) {
          console.warn(`Failed to update repository (continuing with existing files): ${pullError.message}`);
        }
      }
      return await walkDir(localRepoPath);
    } catch (error) {
      console.error(`Failed to scan local repository: ${error.message}`);
      return [];
    }
  }

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;
  try {
    console.log(`Fetching repository tree from: ${url}`);
    const response = await client.get(url);
    return response.data.tree || [];
  } catch (error) {
    console.error(`Failed to fetch repository tree: ${error.message}`);
    if (error.response && error.response.status === 403) {
      console.error('Rate limit exceeded. Try setting GITHUB_TOKEN environment variable or wait for the limit to reset.');
    }
    return [];
  }
}

async function parseAgent(filePath) {
  const content = await fetchFile(filePath);
  if (!content) return null;

  const name = path.basename(filePath).replace('.agent.md', '');
  const { frontmatter } = parseFrontmatter(content);
  const description = frontmatter.description || frontmatter.name || `Agent: ${name}`;
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

  return {
    name,
    description,
    tags,
    path: filePath,
    type: 'agent',
    url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`
  };
}

async function parsePrompt(filePath) {
  const content = await fetchFile(filePath);
  if (!content) return null;

  const name = path.basename(filePath).replace('.prompt.md', '');
  const { frontmatter } = parseFrontmatter(content);
  const description = frontmatter.description || `Prompt: ${name}`;
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

  return {
    name,
    description,
    tags,
    path: filePath,
    type: 'prompt',
    url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`
  };
}

async function parseInstruction(filePath) {
  const content = await fetchFile(filePath);
  if (!content) return null;

  const name = path.basename(filePath).replace('.instructions.md', '');
  const { frontmatter } = parseFrontmatter(content);
  const finalName = frontmatter.name || name;
  const description = frontmatter.description || `Instruction: ${name}`;
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

  return {
    name: finalName,
    description,
    tags,
    path: filePath,
    type: 'instruction',
    url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`
  };
}

async function parseCollection(filePath) {
  const content = await fetchFile(filePath);
  if (!content) return null;

  try {
    // Parse YAML content
    const data = yaml.load(content);
    if (!data || typeof data !== 'object') {
      console.warn(`Invalid collection YAML: ${filePath}`);
      return null;
    }

    // Extract id from filename if not in YAML
    const id = data.id || path.basename(filePath).replace('.collection.yml', '').replace('.collection.yaml', '');
    const name = data.name || id;
    const description = data.description || `Collection: ${name}`;
    const tags = Array.isArray(data.tags) ? data.tags : [];

    // Parse structured items
    const items = (data.items || []).map(item => {
      if (typeof item === 'string') {
        return { path: item, kind: 'prompt' }; // Default kind if not specified
      }
      return {
        path: item.path || '',
        kind: item.kind || 'prompt'
      };
    }).filter(item => item.path);

    // Parse display settings
    const display = data.display ? {
      ordering: data.display.ordering,
      show_badge: data.display.show_badge
    } : undefined;

    return {
      id,
      name,
      description,
      tags,
      items,
      display,
      path: filePath,
      type: 'collection',
      url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`
    };
  } catch (error) {
    console.warn(`Failed to parse collection ${filePath}: ${error.message}`);
    return null;
  }
}

function validateMetadata(metadata) {
  const required = ['version', 'generatedAt', 'source', 'agents', 'prompts'];
  for (const field of required) {
    if (!(field in metadata)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(metadata.agents)) {
    throw new Error('agents must be an array');
  }
  if (!Array.isArray(metadata.prompts)) {
    throw new Error('prompts must be an array');
  }
  if (!Array.isArray(metadata.skills)) {
    throw new Error('skills must be an array');
  }

  return true;
}

async function compareMetadata(oldPath, newMetadata) {
  if (!await fs.pathExists(oldPath)) {
    return { hasChanges: true, oldMetadata: null, stats: {} };
  }

  const oldMetadata = await fs.readJSON(oldPath);
  const oldCounts = {
    agents: oldMetadata.agents?.length || 0,
    prompts: oldMetadata.prompts?.length || 0,
    instructions: oldMetadata.instructions?.length || 0,
    skills: oldMetadata.skills?.length || 0,
    collections: oldMetadata.collections?.length || 0
  };

  const newCounts = {
    agents: newMetadata.agents?.length || 0,
    prompts: newMetadata.prompts?.length || 0,
    instructions: newMetadata.instructions?.length || 0,
    skills: newMetadata.skills?.length || 0,
    collections: newMetadata.collections?.length || 0
  };

  const hasChanges = JSON.stringify(oldCounts) !== JSON.stringify(newCounts);

  return {
    hasChanges,
    oldMetadata,
    stats: {
      agents: { old: oldCounts.agents, new: newCounts.agents, diff: newCounts.agents - oldCounts.agents },
      prompts: { old: oldCounts.prompts, new: newCounts.prompts, diff: newCounts.prompts - oldCounts.prompts },
      instructions: { old: oldCounts.instructions, new: newCounts.instructions, diff: newCounts.instructions - oldCounts.instructions },
      skills: { old: oldCounts.skills, new: newCounts.skills, diff: newCounts.skills - oldCounts.skills },
      collections: { old: oldCounts.collections, new: newCounts.collections, diff: newCounts.collections - oldCounts.collections }
    }
  };
}

async function verifyMetadataFile(filePath) {
  try {
    if (!await fs.pathExists(filePath)) {
      console.error(`✗ Metadata file not found: ${filePath}`);
      return false;
    }

    const metadata = await fs.readJSON(filePath);
    validateMetadata(metadata);

    console.log(`✓ Metadata file is valid: ${filePath}`);
    console.log(`  - Version: ${metadata.version}`);
    console.log(`  - Generated: ${metadata.generatedAt}`);
    console.log(`  - Source: ${metadata.source}`);
    console.log(`  - Agents: ${metadata.agents?.length || 0}`);
    console.log(`  - Prompts: ${metadata.prompts?.length || 0}`);
    console.log(`  - Instructions: ${metadata.instructions?.length || 0}`);
    console.log(`  - Skills: ${metadata.skills?.length || 0}`);
    console.log(`  - Collections: ${metadata.collections?.length || 0}`);

    return true;
  } catch (err) {
    console.error(`✗ Metadata validation failed: ${err.message}`);
    return false;
  }
}

async function parseSkill(filePath, tree) {
  const content = await fetchFile(filePath);
  if (!content) return null;

  // Expecting path like: skills/<skill_name>/SKILL.md
  const parts = filePath.split('/');
  const name = parts.length >= 2 ? parts[parts.length - 2] : 'unknown'; // get folder name
  const { frontmatter } = parseFrontmatter(content);

  const description = frontmatter.description || `Skill: ${name}`;
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

  // Get skill directory and list all files in it
  const skillDir = path.dirname(filePath);  // e.g., "skills/webapp-testing"
  const allFiles = tree
    .filter(item => item.path.startsWith(skillDir + '/') && item.type === 'blob')
    .map(item => item.path.replace(skillDir + '/', ''));  // relative paths

  return {
    name,
    description,
    tags,
    path: filePath,
    type: 'skill',
    files: allFiles,
    url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`
  };
}

async function generateMetadata() {
  console.log('Generating metadata.json...');

  // 1. Fetch repo tree ONCE
  const tree = await fetchRepoTree();
  console.log(`Fetched ${tree.length} items from repository tree.`);

  // 2. Filter files in memory
  const agentFiles = tree.filter(item => item.path.startsWith('agents/') && item.path.endsWith('.agent.md'));
  const promptFiles = tree.filter(item => item.path.startsWith('prompts/') && item.path.endsWith('.prompt.md'));
  const instructionFiles = tree.filter(item => item.path.startsWith('instructions/') && item.path.endsWith('.instructions.md'));
  const collectionFiles = tree.filter(item => item.path.startsWith('collections/') && (item.path.endsWith('.collection.yml') || item.path.endsWith('.collection.yaml')));
  const skillFiles = tree.filter(item => item.path.startsWith('skills/') && path.basename(item.path) === 'SKILL.md');

  // 3. Parse files in parallel
  // Parse agents
  const agents = (await Promise.all(
    agentFiles.map(f => parseAgent(f.path))
  )).filter(Boolean);

  // Parse prompts
  const prompts = (await Promise.all(
    promptFiles.map(f => parsePrompt(f.path))
  )).filter(Boolean);

  // Parse instructions
  const instructions = (await Promise.all(
    instructionFiles.map(f => parseInstruction(f.path))
  )).filter(Boolean);

  // Parse collections
  const collections = (await Promise.all(
    collectionFiles.map(f => parseCollection(f.path))
  )).filter(Boolean);

  // Parse skills
  const skills = (await Promise.all(
    skillFiles.map(f => parseSkill(f.path, tree))
  )).filter(Boolean);

  const metadata = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    source: `${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}`,
    agents,
    prompts,
    instructions,
    skills,
    collections
  };

  return metadata;
}

async function main() {
  try {
    if (verifyOnly) {
      // Verify existing metadata file
      const isValid = await verifyMetadataFile(outputPath);
      process.exit(isValid ? 0 : 1);
    }

    // Generate new metadata
    const newMetadata = await generateMetadata();
    validateMetadata(newMetadata);

    if (checkUpdates) {
      // Check for updates compared to existing file
      const comparison = await compareMetadata(outputPath, newMetadata);
      console.log('\nMetadata comparison:');
      for (const [type, stats] of Object.entries(comparison.stats)) {
        const symbol = stats.diff > 0 ? '↑' : stats.diff < 0 ? '↓' : '→';
        console.log(`  ${type}: ${stats.old} → ${stats.new} (${symbol} ${Math.abs(stats.diff)})`);
      }
      if (!comparison.hasChanges) {
        console.log('\nℹ No changes detected in metadata');
      }
    }

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // Write metadata.json
    await fs.writeJSON(outputPath, newMetadata, { spaces: 2 });

    console.log(`\n✓ Metadata generated: ${outputPath}`);
    console.log(`  - Agents: ${newMetadata.agents.length}`);
    console.log(`  - Prompts: ${newMetadata.prompts.length}`);
    console.log(`  - Instructions: ${newMetadata.instructions.length}`);
    console.log(`  - Skills: ${newMetadata.skills.length}`);
    console.log(`  - Collections: ${newMetadata.collections.length}`);
    console.log(`\nDone!`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
