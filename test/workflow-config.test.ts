import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');
const workflowsRoot = path.join(repoRoot, '.github', 'workflows');

function loadWorkflow(fileName: string): string {
  return fs.readFileSync(path.join(workflowsRoot, fileName), 'utf8');
}

function loadDependabotConfig(): string {
  return fs.readFileSync(path.join(repoRoot, '.github', 'dependabot.yml'), 'utf8');
}

function loadPackageJson(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
}

describe('workflow automation contracts', () => {
  it('keeps all GitHub Actions workflow YAML parseable in pull requests', () => {
    const workflowFiles = fs
      .readdirSync(workflowsRoot)
      .filter((fileName) => fileName.endsWith('.yml'))
      .sort();

    expect(workflowFiles).toContain('ci.yml');
    expect(workflowFiles).toContain('dependabot-auto-merge.yml');

    for (const fileName of workflowFiles) {
      expect(() => yaml.load(loadWorkflow(fileName))).not.toThrow();
    }
  });

  it('keeps CI validation focused and parallelized', () => {
    const workflow = loadWorkflow('ci.yml');

    expect(workflow).toContain('quality-gate:');
    expect(workflow).toContain('compatibility:');
    expect(workflow).toContain('matrix:');
    expect(workflow).toContain('node-version: [20, 24]');
    expect(workflow).toContain('fail-fast: false');
    expect(workflow).toContain('needs: [quality-gate, compatibility]');
    expect(workflow).not.toContain('compat-node20:');
    expect(workflow).not.toContain('compat-node24:');
    expect(workflow).not.toContain('publish-beta:');
  });

  it('keeps beta publishing outside the required CI workflow', () => {
    const workflow = loadWorkflow('beta-release.yml');

    expect(workflow).toContain('name: Beta Release');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('verify-beta:');
    expect(workflow).toContain('name: Verify Beta Release Candidate');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'");
    expect(workflow).toContain('needs: verify-beta');
    expect(workflow).toMatch(/publish-beta:[\s\S]*permissions:\s*\n\s+contents:\s*read\s*\n\s+id-token:\s*write/);
    expect(workflow).not.toMatch(/permissions:\s*\n\s+contents:\s*read\s*\n\s+id-token:\s*write\s*\n\s*jobs:/);
    expect(workflow).toContain('npm run ci:release-verify');
    expect(workflow).toContain('npm publish --tag beta --provenance --access public');
  });

  it('opens an upstream sync pull request instead of pushing directly to main', () => {
    const workflow = loadWorkflow('upstream-sync.yml');

    expect(workflow).toContain('sync:');
    expect(workflow).toMatch(/permissions:\s*\n\s+contents:\s*write\s*\n\s+pull-requests:\s*write/);
    expect(workflow).toMatch(/SYNC_BRANCH:\s*automation\/upstream-sync/);
    expect(workflow).toContain('uses: actions/create-github-app-token@v1');
    expect(workflow).toContain('name: Validate Sync Update');
    expect(workflow).toContain('npm run ci:quality');
    expect(workflow).toContain('name: Open Sync Pull Request');
    expect(workflow).toContain("if: steps.check.outputs.updated == 'true'");
    expect(workflow).toContain('GH_TOKEN: ${{ steps.app-token.outputs.token }}');
    expect(workflow).toContain('DEFAULT_BRANCH: ${{ github.event.repository.default_branch }}');
    expect(workflow).toContain('git checkout -B "$SYNC_BRANCH"');
    expect(workflow).toContain('git fetch --no-tags origin "+refs/heads/$SYNC_BRANCH:refs/remotes/origin/$SYNC_BRANCH" || true');
    expect(workflow).toContain('git push --force-with-lease origin "$SYNC_BRANCH"');
    // We use 'gh api' because 'gh pr list --head' does not support '<owner>:<branch>' syntax,
    // which is needed for robust PR detection when syncing from specific branches or forks.
    expect(workflow).toContain('PR_NUMBER=$(gh api --method GET "/repos/$GITHUB_REPOSITORY/pulls" \\');
    expect(workflow).toContain('-f head="$GITHUB_REPOSITORY_OWNER:$SYNC_BRANCH" \\');
    expect(workflow).toContain('-f base="$DEFAULT_BRANCH" \\');
    expect(workflow).toContain('-f state=open \\');
    expect(workflow).toContain('--jq \'.[0].number // empty\')');
    expect(workflow).not.toContain('--head "$GITHUB_REPOSITORY_OWNER:$SYNC_BRANCH"');
    expect(workflow).not.toContain('gh pr list --head "$SYNC_BRANCH"');
    expect(workflow).toContain('if [ -n "$PR_NUMBER" ]; then');
    expect(workflow).toContain('--body-file pr-body.md');
    expect(workflow).toContain('gh pr edit "$PR_NUMBER"');
    expect(workflow).toContain('gh pr create');
    expect(workflow).toContain('--base "$DEFAULT_BRANCH"');
    expect(workflow).not.toContain('--base main');
    expect(workflow).toContain('--label "deps:merge:auto"');
    expect(workflow).toContain('--label "deps:risk:low"');
    expect(workflow).toContain('--add-label "deps:merge:auto"');
    expect(workflow).toContain('--add-label "deps:risk:low"');
    expect(workflow).not.toMatch(/^\s*git push\s*$/m);
  });

  it('runs automation merge checks for both Dependabot and Sync Bot', () => {
    const workflow = loadWorkflow('dependabot-auto-merge.yml');

    expect(workflow).toContain('merge-after-ci:');
    expect(workflow).toContain('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
    expect(workflow).toContain('GH_REPO: ${{ github.repository }}');
    expect(workflow).toContain('name: Resolve automation PR from CI run');
    expect(workflow).toContain('gh pr view "$PR_NUMBER"');
    expect(workflow).toContain('WORKFLOW_RUN_HEAD_BRANCH: ${{ github.event.workflow_run.head_branch }}');
    expect(workflow).toContain('gh pr list --head "$WORKFLOW_RUN_HEAD_BRANCH"');
    expect(workflow).toContain("pr.author?.login === 'dependabot[bot]' || pr.author?.login === 'rbbtsn0w-bot[bot]' || pr.author?.login === 'rbbtsn0w-bot'");
    expect(workflow).toContain('diagnose-failed-ci:');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'failure'");
    expect(workflow).toContain('deps:ci:failed');
    expect(workflow).toContain('Dependency automation detected a failed CI run for this PR.');
    expect(workflow).toContain('<!-- dependency-automation-ci-failed -->');
    expect(workflow).toContain('EXISTING_COMMENT_ID=');
    expect(workflow).toContain('--method PATCH');
  });

  it('keeps breaking dependency majors out of the automated PR queue', () => {
    const config = loadDependabotConfig();

    expect(config).toContain('ignore:');
    expect(config).toContain('dependency-name: "*"');
    expect(config).toContain('"version-update:semver-major"');
    expect(config).not.toContain('- "github-actions"');
  });

  it('declares workflow test parser dependencies explicitly', () => {
    const packageJson = loadPackageJson() as { devDependencies?: Record<string, string> };

    expect(packageJson.devDependencies).toMatchObject({
      'js-yaml': '^4.1.0',
      '@types/js-yaml': '^4.0.9',
    });
  });
});
