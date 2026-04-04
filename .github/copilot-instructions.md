# Copilot / AI Agent Instructions — awesome-copilot-mcp

Short, focused guidance to help an AI coding agent be productive in this repository.

## Big picture
- This project implements an MCP (Model Context Protocol) server that exposes a searchable index of "agents", "prompts", "instructions", "skills" and "collections". See `src/mcp-server.ts` for the server bootstrap and transport choices (stdio vs HTTP).
- Index data is produced by a metadata generator and written to `.metadata.json` at the repo root. This repository uses `scripts/generate-metadata.js` (invoked via `npm run generate-metadata`) to create the index; that script accepts flags such as `--local-repo`, `--verify`, and `--check-updates`. See `scripts/generate-metadata.js` and the `generate-metadata` npm script in `package.json` for details.

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
- Generate metadata: `npm run generate-metadata` (outputs `.metadata.json`). See `scripts/generate-metadata.js` and the `generate-metadata` npm script in `package.json` for flags such as `--local-repo`, `--verify`, and `--check-updates`.

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

## Creation process (how to add or update workspace-level instructions)

Follow the "link, don't embed" principle: prefer linking to canonical docs, scripts, or examples (README, CONTRIBUTING, `scripts/`, `src/`) rather than copying large blocks of text into this file. Keep this document a compact discovery surface.

When creating or updating instructions, prefer this minimal flow:
- Determine scope: workspace-wide (`.github/`), or user-level (`{{VSCODE_USER_PROMPTS_FOLDER}}/`).
- Choose the primitive: Instruction, Prompt, Skill, Agent, or Hook (see decision flow in the agent-customization reference).
- Create the file at the correct path and include YAML frontmatter with `name`, `description`, and `applyTo` only when needed.
- Validate: confirm the file is discoverable (description contains trigger keywords), frontmatter is valid YAML, and the file doesn't `applyTo: "**"` unless truly global.

## Edge cases & anti-patterns
- Description is the discovery surface: if your instruction/skill isn't being found, update the `description` to include the trigger phrases that agents will search for.
- `applyTo: "**"` is a blunt instrument — it loads the instruction for every request and can consume context inappropriately. Use specific globs instead (e.g., `src/api/**`).
- Avoid embedding large examples or full policy text here; link to the canonical source under `awesome-copilot-source/` or `README.md`.

## Common pitfalls
- YAML frontmatter silent failures: unescaped colons, tabs instead of spaces, or mismatched `name` fields can cause an instruction to be ignored. Always wrap descriptive text that contains punctuation in quotes.
- Missing or vague `description` reduces discoverability. Use a clear "Use when: ..." pattern with concrete keywords.
- Referencing non-existent scripts or files (e.g., `generate-metadata-optimized.js`) confuses contributors — link to the actual `scripts/generate-metadata.js` and document supported flags.

## Quick examples (useful snippets)
- Search via tools API (tool name + payload): `{ name: 'search_agents', args: { keywords: 'react', limit: 5 } }` returns names, descriptions and `path` pointing to the source file path in the index.
- Load agent: `{ name: 'load_agent', args: { name: 'python-expert' } }` returns the full agent object (may include `content` if metadata was generated with content).

## Example prompts (try these)
- "Find agents for 'SwiftUI' and show their descriptions and file paths." — quick way to locate relevant agents.
- "Load the agent named 'python-expert' and summarize its steps for setting up a Python dev environment." — useful for onboarding.
- "Show me tests that reference the metadata generator and any failing test output." — helpful when debugging metadata updates.

## Recommended next customizations
- `copilot-instructions:generate-metadata` (instruction): short workspace instruction that documents the canonical `npm run generate-metadata` workflow, common flags, and when CI expects metadata to be updated. Purpose: reduce confusion caused by stale references to alternate scripts.
- `agent:onboarding` (agent): a small custom agent to help new contributors run `npm install`, `npm run build`, `npm test`, and validate metadata locally. Purpose: streamline first-time contributor setup.
- `skill:metadata-maintainer` (skill): a skill that bundles the `check-metadata-size.js` script, common greps/tests, and a checklist for validating metadata before opening PRs. Purpose: provide a deterministic, repeatable checklist for maintainers.

## Where to ask for help / PR guidance
- For changes that affect exported protocol (tool names, input schemas, CLI flags) open a PR and mention metadata impact. Metadata generation PRs are automated; manual review is expected.

---
If any section is unclear or you want more examples (tests, sample payloads, or how to extend the GitHubAdapter caching), tell me which area to expand. 
