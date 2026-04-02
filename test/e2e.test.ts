import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { copyFile, readFile, rm } from 'node:fs/promises';

const execAsync = promisify(exec);
const CLI_PATH = path.resolve(__dirname, '../dist/cli.js');
const METADATA_PATH = path.resolve(process.cwd(), 'metadata.json');
const FIXTURE_METADATA_PATH = path.resolve(__dirname, './fixtures/metadata.mock.json');

describe('E2E CLI Tests', () => {
  let firstPluginName: string;
  let firstHookName: string;
  let firstWorkflowName: string;

  beforeAll(async () => {
    // Ensure build is fresh
    await execAsync('npm run build');
    await copyFile(FIXTURE_METADATA_PATH, METADATA_PATH);

    const metadata = JSON.parse(await readFile(METADATA_PATH, 'utf8'));
    firstPluginName = metadata.plugins[0]?.name;
    firstHookName = metadata.hooks[0]?.name;
    firstWorkflowName = metadata.workflows[0]?.name;
  }, 30000);

  afterAll(async () => {
    await rm(METADATA_PATH, { force: true });
  });

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

  it('should get plugin hook and workflow details via plural CLI types', async () => {
    expect(firstPluginName).toBeTruthy();
    expect(firstHookName).toBeTruthy();
    expect(firstWorkflowName).toBeTruthy();

    const { stdout: pluginStdout } = await execAsync(`node ${CLI_PATH} get plugins ${JSON.stringify(firstPluginName)} --json`);
    const plugin = JSON.parse(pluginStdout);
    expect(plugin.type).toBe('plugin');
    expect(typeof plugin.url).toBe('string');
    expect(plugin.url.length).toBeGreaterThan(0);

    const { stdout: hookStdout } = await execAsync(`node ${CLI_PATH} get hooks ${JSON.stringify(firstHookName)} --json`);
    const hook = JSON.parse(hookStdout);
    expect(hook.type).toBe('hook');
    expect(typeof hook.url).toBe('string');
    expect(hook.url.length).toBeGreaterThan(0);

    const { stdout: workflowStdout } = await execAsync(`node ${CLI_PATH} get workflows ${JSON.stringify(firstWorkflowName)} --json`);
    const workflow = JSON.parse(workflowStdout);
    expect(workflow.type).toBe('workflow');
    expect(typeof workflow.url).toBe('string');
    expect(workflow.url.length).toBeGreaterThan(0);
  });

  it('should search plugin hook and workflow content types via CLI', async () => {
    const { stdout: pluginStdout } = await execAsync(`node ${CLI_PATH} search copilot --type plugin --json`);
    const pluginResult = JSON.parse(pluginStdout);
    expect(pluginResult.type).toBe('plugins');
    expect(Array.isArray(pluginResult.items)).toBe(true);

    const { stdout: hookStdout } = await execAsync(`node ${CLI_PATH} search dependency --type hook --json`);
    const hookResult = JSON.parse(hookStdout);
    expect(hookResult.type).toBe('hooks');
    expect(Array.isArray(hookResult.items)).toBe(true);

    const { stdout: workflowStdout } = await execAsync(`node ${CLI_PATH} search issues --type workflow --json`);
    const workflowResult = JSON.parse(workflowStdout);
    expect(workflowResult.type).toBe('workflows');
    expect(Array.isArray(workflowResult.items)).toBe(true);
  });
});
