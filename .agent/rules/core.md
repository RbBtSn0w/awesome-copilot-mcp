---
trigger: always_on
description: Core Project Instructions and Architecture
---

# Core Project Instructions

## Project Overview
This is an MCP (Model Context Protocol) server for awesome-copilot agents and collections, accessible via CLI and HTTP. It allows searching, exploring, and using various Copilot-related resources.

## Architecture
- **Type**: MCP Server (Node.js)
- **Interfaces**:
    - **Stdio**: Used for local MCP clients (Claude Desktop, etc.) via `npm run start` or `cli.js start`.
    - **HTTP**: Streamable HTTP server for remote/multimodal access via `npm run start-http`.
- **Data Source**: Fetches metadata from GitHub (awesome-copilot) or uses local cache.
    - **Constraint**: `awesome-copilot-source` is an external source directory. **NEVER** record, list, or deeply analyze this folder. It is treated as a read-only external resource.

## Tech Stack
- **Runtime**: Node.js (>= 18.0.0)
- **Language**: TypeScript
- **Testing**: Vitest
- **Linting**: ESLint
- **Build**: `tsc` (TypeScript Compiler)

## Critical Constraints
1.  **Safety**: Do not commit secrets or API keys.
2.  **Performance**: Metadata generation can be heavy; prefer usage of LEAN metadata where possible.
3.  **External Sources**: Respect the `awesome-copilot-source` exclusion rule.
