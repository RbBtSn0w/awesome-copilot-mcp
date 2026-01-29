# Copilot / AI Agent Instructions — awesome-copilot-mcp

Short, focused guidance to help an AI coding agent be productive in this repository.

## Big picture
- This project implements an MCP (Model Context Protocol) server that exposes a searchable index of "agents", "prompts", "instructions", "skills" and "collections". See `src/mcp-server.ts` for the server bootstrap and transport choices (stdio vs HTTP).
- Index data is produced by metadata generation scripts and stored at the repo root as `.metadata.json` (scripts in `scripts/` produce lean/compressed variants). See `scripts/generate-metadata-optimized.js` and `package.json` scripts.

## MCP compliance (required)
- All design decisions, tool/prompt schemas, transports, and server behaviors MUST strictly follow the official MCP specification and patterns. Reference: https://modelcontextprotocol.io/docs/learn/server-concepts#how-prompts-work
- In particular, ensure transport selection (Stdio vs Streamable HTTP), tool capability descriptors, input/output schemas, streaming (SSE) semantics, and error/abort handling match the MCP docs. When in doubt, prefer compatibility with the SDK usage shown in `src/mcp-server.ts` (Server, StdioServerTransport) and follow the SDK types for Tool/Prompt definitions.

## Key components & where to look
- Server bootstrap: `src/mcp-server.ts` — constructs `MCPTools` and `MCPPrompts`, registers handlers.
- Tools (exposed actions): `src/mcp-tools.ts` — defines tool names, input schemas, `handleTool` dispatch and search/load implementations.
- Prompts: `src/mcp-prompts.ts` — prompt definitions used by MCPPrompts.
- GitHub integration & caching: `src/github-adapter.ts` — fetches index/content and provides `fetchIndex()` used by `MCPTools`.
- CLI entrypoint / dist: `dist/cli.js` (built from `src/cli.ts`) — package bin `awesome-copilot-mcp` runs this.

## Developer workflows (concrete commands)
- Build TypeScript → dist: `npm run build` (compiles to `dist/`).
- Run tests: `npm test` (uses Vitest). Coverage: `npm run test:coverage`.
- Start MCP stdio server (recommended for Inspector): `npm run inspect` or `awesome-copilot-mcp debug` (builds then runs stdio).
- Start HTTP server: `npm run start-http` or `npm run inspect:http` for inspector/http combo.
- Generate metadata (recommended lean): `npm run generate-metadata:lean` (outputs `.metadata.json`). See `scripts/generate-metadata-optimized.js` for flags: `--lean`, `--compress`, `--max-size`.

## Project-specific conventions & patterns
- Tool names are snake_case (example: `search_agents`, `load_agent`) and are declared in `getTools()` in `src/mcp-tools.ts` — add both the tool descriptor and the runtime in `handleTool` when adding a new tool.
- Input validation is explicit: required fields (e.g., `keywords` for searches) are checked and throw errors on missing args — follow this pattern when adding handlers.
- Search behavior: case-insensitive, tokenizes by substring and lowercases tags (see `performSearch` in `src/mcp-tools.ts`). Respect that normalization when creating tests or adding fields.
- Loading APIs: `load_instruction` accepts instruction or agent names (backwards compatibility). `load_agent` returns Agent objects from the index.
- Adapter contract: MCPTools expects an object with `fetchIndex(): Promise<IndexData>` — implementors (like `GitHubAdapter`) should preserve `agents`, `prompts`, `instructions`, `collections`, `skills` shape.

## Tests & coverage expectations
- Test runner: Vitest. Config at `vitest.config.ts`. Some files are excluded from coverage and certain files have enforced thresholds (e.g., `src/mcp-tools.ts`, `src/mcp-prompts.ts`). If you change those files, update thresholds or add tests in `test/` to keep CI green.
- Add unit tests under `test/` and follow existing naming (e.g., `mcp-tools.test.ts`, `mcp-prompts.test.ts`). Use `test/setup-vitest.ts` for shared setup.

## Editing guidance & examples
- To add a new search tool called `search_widgets`:
  1. Add descriptor to `getTools()` in `src/mcp-tools.ts` (name, description, inputSchema).
  2. Add a `case 'search_widgets'` branch inside `handleTool` that calls a private `searchWidgets` helper.
  3. Implement `private async searchWidgets(args)` to call `this.adapter.fetchIndex()` and filter items.
  4. Add tests in `test/mcp-tools.test.ts` and adjust coverage thresholds if necessary.

## Integration & CI notes
- Metadata generation is automated via GitHub Actions (`.github/workflows/generate-metadata.yml`). The action runs `npm run generate-metadata:lean` and opens a PR if `.metadata.json` changed. When modifying metadata-related scripts, update that workflow.
- Keep `.metadata.json` lean for repository inclusion; scripts support `--lean` and `--compress` to control size.

## Quick examples (useful snippets)
- Search via tools API (tool name + payload): `{ name: 'search_agents', args: { keywords: 'react', limit: 5 } }` returns names, descriptions and `path` pointing to the source file path in the index.
- Load agent: `{ name: 'load_agent', args: { name: 'python-expert' } }` returns the full agent object (may include `content` if metadata was generated with content).

## Where to ask for help / PR guidance
- For changes that affect exported protocol (tool names, input schemas, CLI flags) open a PR and mention metadata impact. Metadata generation PRs are automated; manual review is expected.

---
If any section is unclear or you want more examples (tests, sample payloads, or how to extend the GitHubAdapter caching), tell me which area to expand. 
