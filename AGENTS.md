# Repository guidance

## Product guardrails

- Treat every result as decision support; the compliance agent makes the final determination.
- Keep OpenAI calls server-side. Do not expose credentials, upload content, or model prompts to the browser or logs.
- Do not persist uploads or review results. Use only request-scoped data unless persistence is explicitly added.
- Prefer `Needs review` whenever extraction or visual evidence is uncertain.

## Engineering conventions

- Use TypeScript, Zod schemas at all runtime boundaries, and deterministic rules for final triage.
- Keep regulatory text and comparison normalization in `lib/validation.ts`; add focused Vitest coverage for every rule change.
- Meet WCAG-friendly basics: keyboard operation, visible focus, semantic labels, high contrast, and plain-language errors.
- Run `npm run lint`, `npm test`, and `npm run build` before handoff.

## Local operation

- Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`. No Azure endpoint or Azure-specific configuration is required.
- Never commit `.env.local`, deployment secrets, generated coverage, or build artifacts.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
