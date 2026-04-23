import { describe, expect, it } from 'vitest';

const { classifyDependabotPr, renderDependencyInbox } = require('../scripts/dependency-automation.js');

describe('classifyDependabotPr', () => {
  it('routes low-risk development dependency updates to auto-merge', () => {
    const result = classifyDependabotPr({
      title: 'chore(deps-dev): bump fs-extra from 11.2.0 to 11.3.0',
      updateType: 'version-update:semver-minor',
      dependencyType: 'direct:development',
      dependencyNames: 'fs-extra',
      labels: 'dependencies',
    });

    expect(result).toMatchObject({
      autoMerge: true,
      mergeLabel: 'deps:merge:auto',
      riskLabel: 'deps:risk:low',
    });
  });

  it('keeps toolchain updates in the manual queue', () => {
    const result = classifyDependabotPr({
      title: 'chore(deps-dev): bump typescript from 5.9.3 to 6.0.3',
      updateType: 'version-update:semver-minor',
      dependencyType: 'direct:development',
      dependencyNames: 'typescript',
      labels: 'dependencies',
    });

    expect(result).toMatchObject({
      autoMerge: false,
      mergeLabel: 'deps:merge:manual',
      riskLabel: 'deps:risk:toolchain',
    });
  });

  it('keeps runtime updates in the manual queue', () => {
    const result = classifyDependabotPr({
      title: 'chore(deps): bump @modelcontextprotocol/sdk from 1.29.0 to 1.30.0',
      updateType: 'version-update:semver-minor',
      dependencyType: 'direct:production',
      dependencyNames: '@modelcontextprotocol/sdk',
      labels: 'dependencies',
    });

    expect(result).toMatchObject({
      autoMerge: false,
      riskLabel: 'deps:risk:runtime',
    });
  });

  it('keeps GitHub Actions updates in the manual queue', () => {
    const result = classifyDependabotPr({
      title: 'ci(deps): bump actions/setup-node from 4 to 6',
      updateType: 'version-update:semver-major',
      dependencyType: '',
      dependencyNames: 'actions/setup-node',
      labels: 'dependencies,github-actions',
    });

    expect(result).toMatchObject({
      autoMerge: false,
      riskLabel: 'deps:risk:actions',
    });
  });

  it('never auto-merges major updates even when they are otherwise low risk', () => {
    const result = classifyDependabotPr({
      title: 'chore(deps-dev): bump dedent from 1.7.1 to 2.0.0',
      updateType: 'version-update:semver-major',
      dependencyType: 'direct:development',
      dependencyNames: 'dedent',
      labels: 'dependencies',
    });

    expect(result).toMatchObject({
      autoMerge: false,
      mergeLabel: 'deps:merge:manual',
      riskLabel: 'deps:risk:low',
    });
  });
});

describe('renderDependencyInbox', () => {
  it('renders an empty inbox message when there are no open PRs', () => {
    const body = renderDependencyInbox([]);

    expect(body).toContain('Open Dependabot PRs: **0**');
    expect(body).toContain('No open Dependabot PRs.');
  });

  it('groups PRs by risk label', () => {
    const body = renderDependencyInbox([
      {
        number: 1,
        title: 'runtime update',
        url: 'https://example.com/1',
        updatedAt: '2026-04-23T01:00:00Z',
        labels: [{ name: 'deps:risk:runtime' }],
      },
      {
        number: 2,
        title: 'low-risk update',
        url: 'https://example.com/2',
        updatedAt: '2026-04-23T02:00:00Z',
        labels: [{ name: 'deps:risk:low' }],
      },
    ]);

    expect(body).toContain('## Runtime Review Queue (1)');
    expect(body).toContain('## Low-Risk Auto-Merge Queue (1)');
    expect(body).toContain('[#1](https://example.com/1) runtime update');
    expect(body).toContain('[#2](https://example.com/2) low-risk update');
  });
});
