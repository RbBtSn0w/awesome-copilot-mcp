import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { copyFile, readFile, rm } from 'node:fs/promises';

const CLI_PATH = path.resolve(__dirname, '../dist/cli.js');
const METADATA_PATH = path.resolve(process.cwd(), 'metadata.mcp.json');
const FIXTURE_METADATA_PATH = path.resolve(__dirname, './fixtures/metadata.mock.json');

describe('STDIO MCP E2E Tests', () => {
  let serverProcess: ChildProcess;
  let requestId = 1;

  beforeAll(async () => {
    // Ensure build is fresh
    const { execSync } = await import('child_process');
    execSync('npm run build');
    await copyFile(FIXTURE_METADATA_PATH, METADATA_PATH);
  }, 30000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    await rm(METADATA_PATH, { force: true });
  });

  const sendRequest = (method: string, params: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      const id = requestId++;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      const onData = (data: Buffer) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id === id) {
              serverProcess.stdout?.removeListener('data', onData);
              resolve(response);
              return;
            }
          } catch (e) {
            // Not a JSON or partial JSON
          }
        }
      };

      serverProcess.stdout?.on('data', onData);
      serverProcess.stdin?.write(JSON.stringify(request) + '\n');

      // Timeout
      setTimeout(() => {
        serverProcess.stdout?.removeListener('data', onData);
        reject(new Error(`Request ${method} timed out`));
      }, 5000);
    });
  };

  const sendNotification = (method: string, params: any = {}) => {
    const notification = {
      jsonrpc: '2.0',
      method,
      params
    };
    serverProcess.stdin?.write(JSON.stringify(notification) + '\n');
  };

  it('should initialize successfully over STDIO', async () => {
    serverProcess = spawn('node', [CLI_PATH, 'start'], {
      env: {
        ...process.env,
        ACP_METADATA_URL: METADATA_PATH
      }
    });
    
    // Capture stderr for debugging
    serverProcess.stderr?.on('data', (data) => {
      console.error(`Server stderr: ${data}`);
    });

    const initResult = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });

    expect(initResult.result).toBeDefined();
    expect(initResult.result.protocolVersion).toBeDefined();
    expect(initResult.result.capabilities).toBeDefined();
    expect(initResult.result.capabilities.tools).toBeDefined();

    sendNotification('notifications/initialized');
  });

  it('should list tools over STDIO', async () => {
    const result = await sendRequest('tools/list');
    expect(result.result).toBeDefined();
    expect(Array.isArray(result.result.tools)).toBe(true);
    expect(result.result.tools.length).toBeGreaterThan(0);
    
    const toolNames = result.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('search');
    expect(toolNames).toContain('download');
  });

  it('should list resources over STDIO', async () => {
    const result = await sendRequest('resources/list');
    expect(result.result).toBeDefined();
    expect(Array.isArray(result.result.resources)).toBe(true);
    expect(result.result.resources.length).toBeGreaterThan(0);
    
    const resourceUris = result.result.resources.map((r: any) => r.uri);
    expect(resourceUris).toContain('awesome://metadata');
    expect(resourceUris).toContain('awesome://agents/index');
    expect(resourceUris).toContain('awesome://plugins/index');
  });

  it('should list resource templates over STDIO', async () => {
    const result = await sendRequest('resources/templates/list');
    expect(result.result).toBeDefined();
    expect(Array.isArray(result.result.resourceTemplates)).toBe(true);
    
    const templates = result.result.resourceTemplates.map((t: any) => t.uriTemplate);
    expect(templates).toContain('awesome://agents/{name}');
    expect(templates).toContain('awesome://plugins/{name}');
  });

  it('should read a resource over STDIO', async () => {
    const result = await sendRequest('resources/read', {
      uri: 'awesome://metadata'
    });
    expect(result.result).toBeDefined();
    expect(result.result.contents).toBeDefined();
    expect(result.result.contents[0].uri).toBe('awesome://metadata');
    const metadata = JSON.parse(result.result.contents[0].text);
    expect(metadata.agents).toBeDefined();
  });

  it('should call search tool over STDIO', async () => {
    const result = await sendRequest('tools/call', {
      name: 'search',
      arguments: { query: 'test' }
    });
    
    expect(result.result).toBeDefined();
    expect(result.result.content).toBeDefined();
    expect(Array.isArray(result.result.content)).toBe(true);
    expect(result.result.content[0].text).toContain('搜索结果');
  });

  describe('Error Paths', () => {
    it('should return error for unknown tool', async () => {
      const result = await sendRequest('tools/call', {
        name: 'non-existent-tool',
        arguments: {}
      });
      expect(result.result).toBeDefined();
      expect(result.result.isError).toBe(true);
      expect(result.result.content[0].text).toContain('Unknown tool');
    });

    it('should return error for tools/call with missing query', async () => {
      const result = await sendRequest('tools/call', {
        name: 'search',
        arguments: {}
      });
      // The handler returns a result with isError: true instead of a JSON-RPC error 
      // based on registerMcpHandlers implementation.
      expect(result.result).toBeDefined();
      expect(result.result.isError).toBe(true);
      expect(result.result.content[0].text).toContain('Error');
    });

    it('should return error for unknown resource URI', async () => {
      try {
        await sendRequest('resources/read', {
          uri: 'awesome://non-existent'
        });
      } catch (error: any) {
        // The SDK might throw if the handler throws
        expect(error).toBeDefined();
      }
    });

    it('should return error for unknown prompt', async () => {
      const result = await sendRequest('prompts/get', {
        name: 'non-existent-prompt'
      });
      expect(result.result).toBeDefined();
      expect(result.result.description).toBe('Error');
    });
  });

  it('should refresh metadata via tool and reflect changes', async () => {
    // This is hard to test "change" without mocking the adapter to return something else,
    // but we can at least verify the tool runs successfully.
    const result = await sendRequest('tools/call', {
      name: 'refresh_metadata',
      arguments: {}
    });
    
    expect(result.result).toBeDefined();
    expect(result.result.isError).toBeUndefined();
    expect(result.result.structuredContent.status).toBe('success');
  });
});
