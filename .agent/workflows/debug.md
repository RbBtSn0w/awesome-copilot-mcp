---
description: Debug an issue
---

# Debug Workflow

This workflow helps you diagnose and fix issues in the project.

## Steps

1.  **Reproduce Issue**
    - Create a reproduction case (script or test).
    - If CLI issue, try running with `npm start` or `npm run debug:cli`.

2.  **Analyze Logs**
    - Use `console.log` or a debugger.
    - Check the output of the reproduction step.

3.  **Identify Root Cause**
    - Trace the error back to the source code.
    - Check for recent changes or environment specificities.

4.  **Implement Fix**
    - Apply the fix in the codebase.
    - Ensure minimal impact.

5.  **Verify Fix**
    - Run the reproduction case again -> it should pass.
    - Run `npm test` to ensure no regressions.

6.  **Cleanup**
    - Remove debugging logs.
    - Commit the fix.
