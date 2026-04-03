import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const execAsync = promisify(exec);
const CLI_PATH = path.resolve(__dirname, '../dist/cli.js');
const FIXTURE_METADATA_PATH = path.resolve(__dirname, './fixtures/metadata.mock.json');

describe('E2E CLI Tests', () => {
  let firstPluginName: string;
  let firstHookName: string;
  let firstWorkflowName: string;
  let tempMetadataDir: string;
  let tempMetadataPath: string;

  const cliEnv = () => ({
    ...process.env,
    ACP_METADATA_URL: pathToFileURL(tempMetadataPath).href
  });

  beforeAll(async () => {
    // Ensure build is fresh
    await execAsync('npm run build');
    tempMetadataDir = await mkdtemp(path.join(tmpdir(), 'awesome-copilot-mcp-'));
    tempMetadataPath = path.join(tempMetadataDir, 'metadata.json');
    await copyFile(FIXTURE_METADATA_PATH, tempMetadataPath);

    const metadata = JSON.parse(await readFile(tempMetadataPath, 'utf8'));
    firstPluginName = metadata.plugins[0]?.name;
    firstHookName = metadata.hooks[0]?.name;
    firstWorkflowName = metadata.workflows[0]?.name;
  }, 30000);

  afterAll(async () => {
    if (tempMetadataDir) {
      await rm(tempMetadataDir, { recursive: true, force: true });
    }
  });

  it('should display help information', async () => {
    const { stdout } = await execAsync(`node ${CLI_PATH} --help`, { env: cliEnv() });
    expect(stdout).toContain('Usage: awesome-copilot-mcp');
    expect(stdout).toContain('Options:');
  });

  it('should support search command', async () => {
    const { stdout } = await execAsync(`node ${CLI_PATH} search "test" --json`, { env: cliEnv() });
    const result = JSON.parse(stdout);

    expect(result.query).toBe('test');
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('should show version', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --version`, { env: cliEnv() });
      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should get plugin hook and workflow details via plural CLI types', async () => {
    expect(firstPluginName).toBeTruthy();
    expect(firstHookName).toBeTruthy();
    expect(firstWorkflowName).toBeTruthy();

    const { stdout: pluginStdout } = await execAsync(`node ${CLI_PATH} get plugins ${JSON.stringify(firstPluginName)} --json`, { env: cliEnv() });
    const plugin = JSON.parse(pluginStdout);
    expect(plugin.type).toBe('plugin');
    expect(typeof plugin.url).toBe('string');
    expect(plugin.url.length).toBeGreaterThan(0);

    const { stdout: hookStdout } = await execAsync(`node ${CLI_PATH} get hooks ${JSON.stringify(firstHookName)} --json`, { env: cliEnv() });
    const hook = JSON.parse(hookStdout);
    expect(hook.type).toBe('hook');
    expect(typeof hook.url).toBe('string');
    expect(hook.url.length).toBeGreaterThan(0);

    const { stdout: workflowStdout } = await execAsync(`node ${CLI_PATH} get workflows ${JSON.stringify(firstWorkflowName)} --json`, { env: cliEnv() });
    const workflow = JSON.parse(workflowStdout);
    expect(workflow.type).toBe('workflow');
    expect(typeof workflow.url).toBe('string');
    expect(workflow.url.length).toBeGreaterThan(0);
  });

  it('should search plugin hook and workflow content types via CLI', async () => {
    const { stdout: pluginStdout } = await execAsync(`node ${CLI_PATH} search copilot --type plugin --json`, { env: cliEnv() });
    const pluginResult = JSON.parse(pluginStdout);
    expect(pluginResult.type).toBe('plugins');
    expect(Array.isArray(pluginResult.items)).toBe(true);

    const { stdout: hookStdout } = await execAsync(`node ${CLI_PATH} search dependency --type hook --json`, { env: cliEnv() });
    const hookResult = JSON.parse(hookStdout);
    expect(hookResult.type).toBe('hooks');
    expect(Array.isArray(hookResult.items)).toBe(true);

    const { stdout: workflowStdout } = await execAsync(`node ${CLI_PATH} search issues --type workflow --json`, { env: cliEnv() });
    const workflowResult = JSON.parse(workflowStdout);
    expect(workflowResult.type).toBe('workflows');
    expect(Array.isArray(workflowResult.items)).toBe(true);
  });
});
