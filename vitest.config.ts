import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    globals: true,
    setupFiles: ['test/setup-vitest.ts'],
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/cli.ts',
        'src/index.ts',
        'src/mcp-server.ts',
        'src/logger.ts',
        'src/types.ts'
      ],
      thresholds: {
        global: {
          branches: 65,
          functions: 80,
          lines: 80,
          statements: 80
        },
        './src/mcp-tools.ts': {
          branches: 80,
          functions: 100,
          lines: 90,
          statements: 85
        },
        './src/mcp-prompts.ts': {
          branches: 50,
          functions: 100,
          lines: 100,
          statements: 100
        },
        './src/github-adapter.ts': {
          branches: 70,
          functions: 85,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});
