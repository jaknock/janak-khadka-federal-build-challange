# Approach, tools, and assumptions

## Approach

Label Check is an inbox-based review prototype for eight fictional
distilled-spirits applications. A reviewer selects an application, compares its
submitted data and label artwork, then records the final determination.

The server sends the bundled label artwork to OpenAI only to extract visible evidence.
Deterministic TypeScript rules compare that evidence with the application data and
return **Match**, **Needs review**, or **Mismatch** with field-level explanations.
The reviewer—not the model—approves or rejects the application.

## Tools used

| Tool | Purpose |
|---|---|
| Next.js 16, React 19, TypeScript | Interface, server rendering, and route handlers. |
| OpenAI Node SDK | Server-side structured vision extraction. |
| Zod | Validation of mock data, requests, and extracted evidence. |
| TypeScript validation engine | Deterministic comparison and recommendation rules. |
| Vitest and ESLint | Automated tests and static quality checks. |
| Vercel or Docker | Deployment options. |

## Assumptions and limits

- The seeded application data is the comparison source of truth.
- The bundled label artwork is legible enough to extract relevant evidence.
- OpenAI output is evidence only; unclear evidence becomes **Needs review**.
- The prototype does not determine physical type size, contrast, placement,
  same-field-of-vision requirements, formula-based statements, or import-specific
  origin requirements.
- All demo applications and labels are fictional. Findings and determinations are
  stored only in the current browser's local storage.
