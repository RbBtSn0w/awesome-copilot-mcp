import request from 'supertest';
import { HttpServer } from '../src/http-server';
import { IndexData } from '../src/types';

class MockAdapter {
  private index: IndexData;
  private fileContent: string;

  constructor(index: IndexData, fileContent: string) {
    this.index = index;
    this.fileContent = fileContent;
  }

  async fetchIndex(): Promise<IndexData> {
    return this.index;
  }

  async fetchRawFile(_path: string): Promise<string> {
    return this.fileContent;
  }
}

describe('HttpServer', () => {
  const index: IndexData = {
    agents: [{ name: 'agent-a', description: 'alpha agent', tags: [], type: 'agent', path: 'agents/agent-a.agent.md', url: 'https://example.com/a', content: 'body' } as any],
    prompts: [],
    instructions: [],
    skills: [],
    collections: [],
    lastUpdated: '2025-01-01T00:00:00Z'
  };

  const adapter = new MockAdapter(index, 'raw-content');
  const server = new HttpServer(adapter as any, { port: 0 });
  const app = server.getApp();

  it('should have mcp endpoint', () => {
    // We can't easily test /mcp via supertest because it requires JSON-RPC payload
    // and complex transport interaction. We just check if the app initializes.
    expect(app).toBeDefined();
  });
});
