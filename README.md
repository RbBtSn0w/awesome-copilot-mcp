# Awesome Copilot MCP Server

[![npm version](https://img.shields.io/npm/v/awesome-copilot-mcp)](https://www.npmjs.com/package/awesome-copilot-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/RbBtSn0w/awesome-copilot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/RbBtSn0w/awesome-copilot-mcp/actions)

A Model Context Protocol (MCP) server that provides access to [awesome-copilot](https://github.com/github/awesome-copilot) agents and collection resources.

## Quick Start (No Installation Required)

Add to your MCP Client configuration (e.g., Claude Desktop or VS Code):

```json
{
  "mcpServers": {
    "awesome-copilot": {
      "command": "npx",
      "args": ["-y", "awesome-copilot-mcp", "start"]
    }
  }
}
```

This ensures you always run the latest version.

## Usage

### As MCP Server

Standard stdio usage (default). See configuration above.

### As HTTP / OpenAPI Server

Run locally for remote access or OpenAPI testing:

```bash
npx -y awesome-copilot-mcp start-http --port 8080 --host 0.0.0.0
```

Available endpoints:
- `GET /health` Health check
- `GET /metadata` Return metadata index
- `GET /metadata/stream` SSE streaming output of metadata
- `GET /search?q=kw` Search
- `GET /openapi.json` API Documentation

## Debugging

MCP Inspector is the recommended way to test and debug:

```bash
# Debug via Stdio (Recommended)
npx -y awesome-copilot-mcp debug --no-build

# Debug via HTTP
npm run inspect:http
```

## Architecture

This server uses a **Bundled + In-Memory** architecture for maximum reliability:
1. **Startup**: Loads `metadata.json` bundled directly within the npm package. Zero external dependencies.
2. **Hot Updates**: `refresh_metadata` fetches the latest data from GitHub and stores it in **memory** for the current session.
3. **Sandbox Friendly**: No local disk cache (`~/.cache`) is used, preventing permission issues in restricted environments (e.g., macOS App Sandbox).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ACP_METADATA_URL` | Optional. URL to a hosted `metadata.json` (e.g. `https://yourname.github.io/repo/metadata.json`). Overrides GitHub raw fetch. |
| `ACP_REPOS_JSON` | Custom repository configuration JSON. |

## Metadata Generation

**Automated**: GitHub Actions runs daily to fetch the latest metadata from `github/awesome-copilot` and publishes a new npm version if changes are detected.

**Internal**:
The metadata file is lightweight (~170 KB) containing only index info. Actual content (Agent instructions, prompts) is fetched on-demand via the `download` tool.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## License

MIT