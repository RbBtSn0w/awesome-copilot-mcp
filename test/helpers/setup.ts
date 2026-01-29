import setupDefaultMocks from './mocks';
export { setupDefaultMocks };
export { MockGitHubAdapter, createMockAdapter, shouldUseMockAdapter, createTestAdapter } from './mock-adapter';

export function registerTestHelpers() {
  const mocks = setupDefaultMocks();
  // By default do not silence console; tests can call mocks.silence()
  return { mocks };
}

export default registerTestHelpers;
