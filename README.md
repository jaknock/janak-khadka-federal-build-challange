# Label Check — AI-Powered Alcohol Label Verification

Label Check is a standalone prototype for TTB compliance agents. An agent can open a
mock notification inbox, upload a single label, or upload a CSV batch, then review
clear field-by-field findings. The app recommends a result; the compliance agent
always makes the final determination.

The original challenge brief is preserved in [ASSIGNMENT.md](ASSIGNMENT.md).
See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the program sequence diagrams and data flow.
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the high-level architecture and
technology stack.

## What it does

- **Mock review inbox:** opens with six fictional label-review notifications sourced
  from a server-owned mock database.
- **One-click batch verification:** checks every pending label with its matching
  stored application data and bundled artwork; no browser file selection is needed.
- **Single-label upload:** accepts one label image and its application details.
- **CSV batch upload:** pairs application rows with uploaded label images whose
  filenames match the CSV rows.
- Extracts visible label evidence with a single OpenAI vision request per image.
- Compares brand, class/type, alcohol content, net contents, producer, and country
  of origin against optional application values.
- Checks the government-warning wording exactly and flags uncertain header formatting
  for human review.
- Returns **Pass**, **Needs review**, or **Mismatch** with plain-language reasons.
- Processes mock and uploaded batches with bounded concurrency; a failed label does
  not prevent the remaining results from being returned.

## Bundled samples

The seeded review inbox contains six fictional labels and their application data.
Selecting **Verify 6 labels** runs the entire pending queue. The queue is mock data,
so refreshing the page restores its six pending notifications.

## Design

The model extracts what it sees; deterministic TypeScript code assigns the result.
This prevents a model from silently correcting the very wording and values being
verified. Low-confidence or visually uncertain evidence is routed to **Needs review**.

The mock database is bundled server-side for this prototype. Verification results are
request-scoped and the queue state is browser-only; nothing is persisted after refresh.
There is no authentication, COLA integration, or automatic approval/rejection behavior.

### Regulatory scope

This is a **distilled-spirits review assistant**, not a compliance-certification
system. It checks application-to-label values, the health-warning wording/format, and
the basic alcohol-content notation. It does not determine physical type size, contrast,
continuous-paragraph placement, the same-field-of-vision requirement, formula-based
statements, or whether a country-of-origin statement is required for a particular
import. Those remain explicit human-review decisions.

## Local setup

Requires Node.js 20+ and a regular OpenAI API key. This project uses the OpenAI API
directly—there is no Azure endpoint, deployment name, or Azure-specific credential to
configure.

```bash
npm install
cp .env.example .env.local
# Set OPENAI_API_KEY in .env.local
npm run dev
```

Open <http://localhost:3000>. To use another port locally, run, for example,
`npm run dev -- --port 3003`. Keep `.env.local` local; it is ignored by Git.

### Configuration

| Variable | Required | Description |
|---|---:|---|
| `OPENAI_API_KEY` | Yes | Regular OpenAI API key used only by the server-side extraction route. |
| `OPENAI_MODEL` | No | Vision-capable model; defaults to `gpt-4o-mini`. |

The browser never receives the API key. For inbox work it sends pending mock-review
IDs and the route loads label artwork on the server. For manual review it sends the
chosen image to the Next.js API route, which calls the vision model from the server.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

The Vitest suite covers every bundled fixture outcome, field and warning validation,
extraction-schema normalization, the six-record mock queue, notification endpoint,
and batch-review request contract.

## Deployment

The production application is available at:
[janak-khadka-federal-build-challeng.vercel.app](https://janak-khadka-federal-build-challeng.vercel.app).

For Vercel, configure `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL` as
Production environment variables, then deploy with `vercel deploy --prod`. Do not
commit those values. The included [Dockerfile](Dockerfile) is available for other
hosting platforms and listens on port `3000`.

## Limitations

- The MVP focuses on common distilled-spirits fields and does not determine every
  beverage-specific regulatory requirement.
- Font-size, contrast, placement, and layout requirements cannot be measured reliably
  from an uncalibrated label photograph.
- Warning-header bold detection is best-effort visual evidence and is never an
  automatic rejection.
