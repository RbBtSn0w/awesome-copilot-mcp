import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');

function loadWorkflow(fileName: string): string {
  return fs.readFileSync(path.join(repoRoot, '.github', 'workflows', fileName), 'utf8');
}

describe('workflow automation contracts', () => {
  it('opens an upstream sync pull request instead of pushing directly to main', () => {
    const workflow = loadWorkflow('upstream-sync.yml');

    expect(workflow).toContain('sync:');
    expect(workflow).toMatch(/permissions:\s*\n\s+contents:\s*write\s*\n\s+pull-requests:\s*write/);
    expect(workflow).toMatch(/SYNC_BRANCH:\s*automation\/upstream-sync/);
    expect(workflow).toContain('uses: actions/create-github-app-token@v1');
    expect(workflow).toContain('name: Open Sync Pull Request');
    expect(workflow).toContain("if: steps.check.outputs.updated == 'true'");
    expect(workflow).toContain('GH_TOKEN: ${{ steps.app-token.outputs.token }}');
    expect(workflow).toContain('git checkout -B "$SYNC_BRANCH"');
    expect(workflow).toContain('git fetch --no-tags origin "+refs/heads/$SYNC_BRANCH:refs/remotes/origin/$SYNC_BRANCH" || true');
    expect(workflow).toContain('git push --force-with-lease origin "$SYNC_BRANCH"');
    expect(workflow).toContain('gh pr create');
    expect(workflow).toContain('--body-file pr-body.md');
    expect(workflow).not.toMatch(/^\s*git push\s*$/m);
  });

  it('runs Dependabot merge checks with explicit GitHub repository context', () => {
    const workflow = loadWorkflow('dependabot-auto-merge.yml');

    expect(workflow).toContain('merge-after-ci:');
    expect(workflow).toContain('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
    expect(workflow).toContain('GH_REPO: ${{ github.repository }}');
    expect(workflow).toContain('name: Resolve Dependabot PR from CI run');
    expect(workflow).toContain('gh pr view "$PR_NUMBER"');
  });
});
