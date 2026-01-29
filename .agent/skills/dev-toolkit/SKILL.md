---
name: dev-toolkit
description: Common development commands for creating, testing, and building the project.
---

# Development Toolkit

This skill provides a set of standard commands for working with the Awesome Copilot MCP Server.

## Commands

### 1. Build
Compiles the TypeScript source code to the `dist/` directory.

```bash
npm run build
```

### 2. Test
Runs the test suite using Vitest.

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### 3. Lint
Checks the code for style and potential errors.

```bash
# Check linting
npm run lint

# Fix linting issues where possible
npm run lint:fix
```

### 4. Run Locally (MCP Mode)
Starts the MCP server in stdio mode (for testing with Inspector or local clients).

```bash
# Start server
npm start

# Debug with MCP Inspector
npm run inspect:stdio
```

### 5. Metadata Generation
Commands for managing the awesome-copilot metadata.

```bash
# Generate full metadata
npm run generate-metadata

# Generate LEAN metadata (recommended for basic dev)
npm run generate-metadata:lean

# Verify metadata integrity
npm run generate-metadata:verify

# Check metadata size
npm run check:metadata-size
```

### 6. HTTP Server & Inspection
Commands for running the server in HTTP mode and inspecting it.

```bash
# Start HTTP server
npm run start-http

# Start HTTP server (debug mode with port 8080)
npm run start-http:debug

# Inspect using MCP Inspector (Stdio) - Recommended for CLI
npm run inspect:stdio

# Inspect using MCP Inspector (HTTP)
npm run inspect:http
```

### 7. Debugging & Maintenance
Helper commands for debugging and maintenance.

```bash
# Debug CLI directly
npm run debug:cli

# Archive large reports
npm run archive:reports

# Clean build artifacts
npm run clean
```
