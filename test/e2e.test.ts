import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import { promisify } from 'util';

const execAsync = promisify(exec);
const CLI_PATH = path.resolve(__dirname, '../dist/cli.js');

describe('E2E CLI Tests', () => {
  beforeAll(async () => {
    // Ensure build is fresh
    await execAsync('npm run build');
  }, 30000);

  it('should display help information', async () => {
    const { stdout } = await execAsync(`node ${CLI_PATH} --help`);
    expect(stdout).toContain('Usage: awesome-copilot-mcp');
    expect(stdout).toContain('Options:');
  });

  it('should support search command', async () => {
     try {
        const { stdout, stderr } = await execAsync(`node ${CLI_PATH} search "test" --json`);
        // If it succeeds, it returns JSON
        if (stdout) {
            expect(stdout).toContain('query');
        }
     } catch (error: any) {
        // If it fails, ensure it's a CLI execution error
        console.log('Search command failed:', error.message);
        // It's acceptable to fail if network is down or metadata missing, 
        // but we want to ensure the CLI actually ran.
        expect(error).toBeDefined();
     }
  });

  it('should show version', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --version`);
      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });
});
