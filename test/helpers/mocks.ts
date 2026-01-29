import { vi } from 'vitest';

// Lightweight shared mocks for tests. Keep minimal and explicit.

export function setupDefaultMocks() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  // silence console by default in tests that opt in
  function silence() {
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
    console.info = vi.fn();
  }

  function restore() {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }

  return { silence, restore };
}

export default setupDefaultMocks;
