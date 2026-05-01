import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');

function loadWorkflow(fileName: string): any {
  const content = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', fileName), 'utf8');
  return yaml.load(content);
}

function namedStep(steps: any[], name: string): any {
  const step = steps.find((item) => item.name === name);
  expect(step).toBeDefined();
  return step;
}

describe('workflow automation contracts', () => {
  it('opens an upstream sync pull request instead of pushing directly to main', () => {
    const workflow = loadWorkflow('upstream-sync.yml');
    const syncJob = workflow.jobs.sync;
    const openPrStep = namedStep(syncJob.steps, 'Open Sync Pull Request');
    const script = openPrStep.run as string;

    expect(syncJob.permissions).toMatchObject({
      contents: 'write',
      'pull-requests': 'write',
    });
    expect(syncJob.env.SYNC_BRANCH).toBe('automation/upstream-sync');
    expect(openPrStep.if).toBe("steps.check.outputs.updated == 'true'");
    expect(openPrStep.env.GH_TOKEN).toBe('${{ steps.app-token.outputs.token }}');
    expect(script).toContain('git checkout -B "$SYNC_BRANCH"');
    expect(script).toContain('git push --force-with-lease origin "$SYNC_BRANCH"');
    expect(script).toContain('gh pr create');
    expect(script).toContain('--body-file pr-body.md');
    expect(script).not.toMatch(/^\s*git push\s*$/m);
  });

  it('runs Dependabot merge checks with explicit GitHub repository context', () => {
    const workflow = loadWorkflow('dependabot-auto-merge.yml');
    const mergeJob = workflow.jobs['merge-after-ci'];

    expect(mergeJob.env).toMatchObject({
      GH_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
      GH_REPO: '${{ github.repository }}',
    });

    const resolveStep = namedStep(mergeJob.steps, 'Resolve Dependabot PR from CI run');
    expect(resolveStep.run).toContain('gh pr view "$PR_NUMBER"');
  });
});
