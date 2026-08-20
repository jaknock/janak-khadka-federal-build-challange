# Label Check — AI-assisted alcohol label review

Label Check is a decision-support prototype for TTB compliance agents. It provides a
mock inbox of eight fictional distilled-spirits applications. Agents verify bundled
label artwork, inspect field-level findings, and make the final determination.

The current interface is inbox-only. It does not offer single-label or CSV uploads.

## What reviewers can do

- Select one or more pending applications, or open one application for closer review.
- Compare the submitted application data and label artwork side by side.
- Run verification and review findings for brand, class/type, alcohol content, net
  contents, producer, country of origin, and the government warning.
- Record an **Approve** or **Reject** determination. Rejections require a reason.
- Reset the browser's demo state to start over.

Verification returns **Match**, **Needs review**, or **Mismatch**. These are
recommendations only; the compliance agent makes every final decision.

## How it works

1. The server loads a selected fictional application and its bundled label artwork.
2. OpenAI extracts only visible label evidence using a server-side request.
3. Deterministic TypeScript rules compare that evidence with the application data.
4. The browser presents the findings for human review.

Unclear or low-confidence visual evidence is routed to **Needs review**. The model
does not approve or reject applications.

## Scope and data handling

This is a distilled-spirits review assistant, not a compliance-certification system.
It does not determine physical type size, contrast, placement, same-field-of-vision
requirements, formula-based statements, or whether an origin statement is required.
Those decisions remain with the reviewer.

All applications and labels in the demo are fictional. The mock queue is bundled with
the app. Verification findings and human decisions are stored only in the current
browser's local storage; they are not shared with other users or sent to TTB. The
prototype has no authentication, COLA integration, or automatic determination.

## Local setup

Requires Node.js 20+ and a regular OpenAI API key.

```bash
npm install
cp .env.example .env.local
# Set OPENAI_API_KEY in .env.local
npm run dev
```

Open <http://localhost:3000>. Keep `.env.local` local; it is ignored by Git.

| Variable | Required | Description |
|---|---:|---|
| `OPENAI_API_KEY` | Yes | Used only by the server-side extraction route. |
| `OPENAI_MODEL` | No | Vision-capable model; defaults to `gpt-4o-mini`. |

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Further reading

- [Workflow](docs/WORKFLOW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Original challenge brief](ASSIGNMENT.md) — historical context; it is not the
  source of truth for the current feature set.

## Deployment

[janak-khadka-federal-build-challeng.vercel.app](https://janak-khadka-federal-build-challeng.vercel.app)

Configure `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL` as deployment secrets.
The included [Dockerfile](Dockerfile) supports self-hosted Node.js deployments.
