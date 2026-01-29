---
description: Add a new feature
---

# Add Feature Workflow

This workflow guides you through the process of adding a new feature to the awesome-copilot-mcp project.

## Steps

1.  **Analyze Requirements**
    - Understand the feature request.
    - Identify which components (MCP server, CLI, Metadata) are affected.

2.  **Create Implementation Plan**
    - Create a plan in `implementation_plan.md`.
    - Outline changes to files.
    - Define verification steps.

3.  **Implement Changes**
    - Follow the `implementer` persona.
    - Write code in `src/`.
    - Update `package.json` if dependencies are needed.

4.  **Verify Feature**
    - Run `npm test` to ensure no regressions.
    - Add new tests for the feature.
    - (Optional) Run `npm run inspect:stdio` or `npm run inspect:http` to verify manually with MCP Inspector.

5.  **Finalize**
    - Update documentation if needed.
    - Clean up any temporary files.
