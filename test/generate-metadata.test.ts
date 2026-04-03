import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SCRIPT_PATH = path.resolve(__dirname, '../scripts/generate-metadata.js');

describe('generate-metadata verify', () => {
  async function writeMetadataFile(metadata: Record<string, unknown>) {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'awesome-copilot-metadata-'));
    const metadataPath = path.join(tempDir, 'metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    return { tempDir, metadataPath };
  }

  it('fails verification when legacy core sections are missing', async () => {
    const { tempDir, metadataPath } = await writeMetadataFile({
      version: '1.0.0',
      generatedAt: '2026-04-03T00:00:00.000Z',
      source: 'github/awesome-copilot@main',
      prompts: [],
      instructions: [],
      skills: [],
      collections: [],
      plugins: [],
      hooks: [],
      workflows: []
    });

    try {
      await expect(execFileAsync('node', [SCRIPT_PATH, '--verify', '--output', metadataPath])).rejects.toMatchObject({
        stderr: expect.stringContaining('Missing required field: agents')
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('accepts metadata when only new content sections are absent', async () => {
    const { tempDir, metadataPath } = await writeMetadataFile({
      version: '1.0.0',
      generatedAt: '2026-04-03T00:00:00.000Z',
      source: 'github/awesome-copilot@main',
      agents: [],
      prompts: [],
      instructions: [],
      skills: [],
      collections: []
    });

    try {
      await expect(execFileAsync('node', [SCRIPT_PATH, '--verify', '--output', metadataPath])).resolves.toMatchObject({
        stdout: expect.stringContaining('Metadata file is valid')
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
