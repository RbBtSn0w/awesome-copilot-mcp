import { vi } from 'vitest';

// Mock fs-extra for tests
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readJson: vi.fn(),
    ensureDirSync: vi.fn(),
    remove: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
  },
  pathExists: vi.fn(),
  readJson: vi.fn(),
  ensureDirSync: vi.fn(),
  remove: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
}));

// Mock axios for tests
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    create: () => ({ get: vi.fn(), post: vi.fn() }),
  },
  get: vi.fn(),
  post: vi.fn(),
  create: () => ({ get: vi.fn(), post: vi.fn() }),
}));

