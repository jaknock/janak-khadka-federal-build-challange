# Label Check — AI-Powered Alcohol Label Verification

Label Check is a standalone prototype for TTB compliance agents. An agent uploads
one or more alcohol-label images, enters the available application data, and reviews
clear field-by-field findings. The app recommends a result; the compliance agent
always makes the final determination.

The original challenge brief is preserved in [ASSIGNMENT.md](ASSIGNMENT.md).
See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the program sequence diagrams and data flow.

## What it does

- **Single label mode:** accepts one label image and its application details.
- **Batch CSV mode:** pairs one CSV row per application with label images that share
  the row's `filename`; each item keeps its own application details and result.
- Extracts visible label evidence with a single OpenAI vision request per image.
- Compares brand, class/type, alcohol content, net contents, producer, and country
  of origin against optional application values.
- Checks the government-warning wording exactly and flags uncertain header formatting
  for human review.
- Returns **Pass**, **Needs review**, or **Mismatch** with plain-language reasons.
- Processes batch work with three concurrent browser-side requests; failed images do
  not prevent other results from being returned or exported.

## Bundled samples

Choose a sample from the single-label **Sample data** dropdown to populate the form
and load its label artwork automatically. In batch mode, choose **Load bundled sample
batch** to load six fictional labels and `applications.csv` from `public/samples/`.
You can also download a CSV template directly from the batch workflow.

## Design

The model extracts what it sees; deterministic TypeScript code assigns the result.
This prevents a model from silently correcting the very wording and values being
verified. Low-confidence or visually uncertain evidence is routed to **Needs review**.

Uploads and results are request-scoped. The prototype has no database, authentication,
COLA integration, or automatic approval/rejection behavior.

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

Open <http://localhost:3000>. Keep `.env.local` local; it is ignored by Git.

### Configuration

| Variable | Required | Description |
|---|---:|---|
| `OPENAI_API_KEY` | Yes | Regular OpenAI API key used only by the server-side extraction route. |
| `OPENAI_MODEL` | No | Vision-capable model; defaults to `gpt-4o-mini`. |

The browser never receives the API key. It sends uploaded images to the Next.js API
route, which sends the vision request from the server.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

The Vitest suite covers every bundled fixture outcome, field and warning validation,
CSV parsing/export, extraction-schema normalization, and the `/api/reviews` request
contract (success, invalid input, file limits, batch isolation, and provider errors).

## Deployment

The included [Dockerfile](Dockerfile) creates a production container listening on
port `3000`. Set `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL` as deployment
environment variables or secrets. Do not commit those values.

## Limitations

- The MVP focuses on common distilled-spirits fields and does not determine every
  beverage-specific regulatory requirement.
- Font-size, contrast, placement, and layout requirements cannot be measured reliably
  from an uncalibrated label photograph.
- Warning-header bold detection is best-effort visual evidence and is never an
  automatic rejection.
