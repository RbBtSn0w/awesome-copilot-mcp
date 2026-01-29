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
    - Follow a standard format (e.g., Conventional Commits):
        - `feat: ...` for new features.
        - `fix: ...` for bug fixes.
        - `docs: ...` for documentation changes.
        - `refactor: ...` for code changes that neither fix a bug nor add a feature.
        - `chore: ...` for maintenance tasks.

5.  **Commit**
    // turbo
    - Run `git commit -m "<message>"` with your descriptive message.

6.  **Verify**
    - Run `git log -n 1` to verify the commit.
