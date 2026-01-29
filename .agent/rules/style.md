---
trigger:
  globs:
    - "{ts,tsx,js,jsx}"
description: Code Style and Naming Conventions
---

# Code Style Guidelines

## Naming Conventions
- **Files**: kebab-case (e.g., `generate-metadata.ts`, `metadata-utils.ts`).
- **Classes**: PascalCase (e.g., `CopilotClient`, `MetadataService`).
- **Functions/Methods**: camelCase (e.g., `generateMetadata`, `fetchAgent`).
- **Variables**: camelCase (e.g., `agentList`, `metadataPath`).
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_CACHE_TTL`, `API_BASE_URL`).

## TypeScript Best Practices
- **Types**: Use `interface` for object shapes, `type` for unions/primitives.
- **Strictness**: Strict mode is enabled. Avoid `any` whenever possible; use `unknown` if necessary.
- **Async/Await**: Prefer `async/await` over raw Promises/callbacks.

## Formatting
- **Indentation**: 2 spaces (standard JS/TS).
- **Quotes**: Single quotes preferred, double quotes for JSON.
- **Semicolons**: Always use semicolons.
- **Linting**: Follow `eslint` rules defined in `.eslintrc` (or default config).

## Testing
- Use **Vitest** for unit and integration tests.
- Place tests in `test/` directory or alongside source files (if configured).
- naming pattern: `*.test.ts`.
