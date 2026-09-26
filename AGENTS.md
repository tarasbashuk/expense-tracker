# Agent instructions

## Readability and formatting

Follow these conventions when creating or editing code, including tests:

- Use one blank line after the final import, before declarations or executable code. Keep related imports together.
- Separate distinct logical steps with one blank line: setup, validation, computation, side effects, and the final result.
- Add a blank line before `if`, `switch`, `for`, `while`, `do`, `try`, `return`, and `throw` when another statement precedes them in the same block. Do not add a blank line immediately after an opening brace just to satisfy this rule.
- Separate a completed control-flow block from the next independent statement with a blank line. Keep `else`, `catch`, and `finally` attached to their associated block.
- Separate function, type, and interface declarations from surrounding code with a blank line. Related simple variable declarations may stay together.
- Prefer named intermediate variables over deeply nested expressions when they make the steps easier to read.
- Keep helpers that do not depend on a function's local state at module scope. Compute static derived data outside React components instead of rebuilding it on each render.
- Preserve intentional blank lines. Prettier does not insert all the spacing required here, so inspect the formatted result before finishing.
- Apply these conventions to changed code; do not reformat unrelated files as part of a feature or fix.

## Tests

- Use Vitest and TypeScript (`tests/**/*.test.ts`) with `import`, `expect`, and `vi.mock`. Do not add a custom module loader or CommonJS test infrastructure.
- Put a blank line between every neighboring `it` or `test` case, including cases inside `describe`.
- Separate `describe` blocks, lifecycle hooks (`beforeEach`, `afterEach`, etc.), fixtures, and mock setup from adjacent logical blocks with a blank line.
- Inside a test, visually separate arrangement, the action under test, and assertions with blank lines. Keep related assertions together; comments labeling every phase are unnecessary.
- Mock external services; routine tests must not call a live database, Clerk, OpenAI, or email service.
- After behavior changes, run the relevant tests and `npm run typecheck`. Run `npm test` after test infrastructure changes. Preserve the existing test gate before production builds.
