---
description: Commit changes to Git
---

# Git Commit Workflow

This workflow guides you through the process of committing changes with clear, descriptive messages.

## Steps

1.  **Check Status**
    - Run `git status` to see what changes are staged or unstaged.

2.  **Review Changes**
    - Use `git diff` or `git diff --staged` to review the actual code changes.
    - Ensure no debug logs or temporary files are included.

3.  **Stage Files**
    - Stage the relevant files using `git add <file>` or `git add .` if everything is ready.

4.  **Create Commit Message**
        - Follow the Conventional Commits specification. Examples of valid types:
                - `feat(scope): add new feature`
                - `fix(scope): fix a bug`
                - `perf: improve performance`
                - `docs: update README`
                - `refactor: change API internals`
                - `chore: bump deps`
                - `feat!: breaking change` or include `BREAKING CHANGE: ...` in the body to indicate a breaking change

            Note: semantic-release will determine the next version (major/minor/patch) based on these types and any BREAKING CHANGES.

            Consider using `commitizen` to help authors create compliant commits:
            ```bash
            npx commitizen init cz-conventional-changelog --save-dev --save-exact
            npx cz
            ```

            If the project has Husky + commitlint configured, commit messages will be validated by a commit-msg hook and non-compliant messages will be rejected.

5.  **Commit**
        - Run `git commit -m "<message>"` with your descriptive Conventional Commit message.
        - If Husky is enabled, the `.husky/commit-msg` hook will run and commitlint will validate the message format.

            Example compliant commit:
            ```bash
            git add src/foo.ts
            git commit -m "feat(cli): add --dry-run option"
            ```

            Example non-compliant commit (will be rejected):
            ```bash
            git commit -m "fixed bug"
            ```

6.  **Verify**
    - Run `git log -n 1` to verify the commit.

## Local testing of commit hooks
- Install dependencies and enable Husky (the `prepare` script runs automatically after `npm install`):
    ```bash
    npm install
    npm run prepare   # run manually if needed
    ```
- Test a non-compliant commit (should be blocked):
    ```bash
    git commit --allow-empty -m "bad message"
    ```
- Test a compliant commit (should succeed):
    ```bash
    git commit --allow-empty -m "feat: add example"
    ```

## Notes
- This repository uses Conventional Commits and semantic-release for automated versioning and releases. Please inform contributors to follow the commit format in PR descriptions or contribution docs. See `commitlint.config.js` and `.husky/commit-msg` for configuration details.
