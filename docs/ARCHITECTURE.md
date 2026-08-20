# Architecture and technology stack

Label Check is a server-rendered Next.js application with a mock review inbox. It uses
an OpenAI vision model only to extract visible label evidence; the server-side
validation engine deterministically assigns a recommendation. Eight fictional records
are seeded in a server-owned mock database and are not persistently modified.

## High-level architecture

```mermaid
flowchart LR
    Agent[TTB compliance agent]
    Browser[Next.js browser UI\nReview inbox]
    Queue[Mock review database\nEight fictional applications]
    Samples[Bundled label artwork\npublic/samples]
    API[Next.js route handler\nPOST /api/reviews/batch]
    Guard[Review-ID validation\nZod request schema]
    Vision[OpenAI vision API\nStructured label extraction]
    Rules[TypeScript validation engine\nTTB-oriented comparison rules]

    Agent --> Browser
    Queue --> Browser
    Queue --> API
    Samples --> API
    Browser -->|selected review IDs| API
    API --> Guard
    Guard --> Vision
    Vision -->|visible evidence JSON| Rules
    Rules -->|findings + recommendation| API
    API --> Browser
    Browser -->|Match / Needs review / Mismatch| Agent
```

### Request flow

1. The agent opens the inbox and sees eight pending mock notifications.
2. The agent can open any application underneath the inbox to compare its details
   beside the label, selects one or more inbox applications, and starts verification.
3. The API validates the request, retrieves application data from the mock database,
   and reads the corresponding bundled artwork on the server.
4. The server sends the image to OpenAI with a strict JSON schema to transcribe
   visible label evidence and warning-format observations.
5. The validation engine compares that evidence with the application values and
   applies alcohol-content and government-warning rules.
6. The API returns independent results with field-level explanations. The browser
   displays the evidence and saves results and decisions locally for that browser only.

The mock-inbox route runs up to eight seeded labels concurrently for demo speed. Each
result records its server-side time against a five-second response target. The vision
request may run for 12 seconds, with a 15-second hard timeout. A failed or timed-out
label produces an individual error rather than failing the selected set.

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Web framework | Next.js 16, React 19, TypeScript | User interface, routing, and server-side API route. |
| Styling | CSS in `app/globals.css` | Responsive, TTB-inspired application interface. |
| API | Next.js Route Handler on Node.js | Receives known pending-review IDs at `POST /api/reviews/batch`. |
| AI extraction | OpenAI Node SDK and a vision-capable model | Extracts structured, visible evidence from each label image. |
| Validation | TypeScript in `lib/validation.ts` | Deterministic application-to-label checks and recommendations. |
| Input contracts | Zod | Validates application fields and the model extraction response. |
| Testing | Vitest | Unit and route-contract test coverage. |
| Linting | ESLint | Static code-quality checks. |
| Deployment | Vercel or Docker/Node.js host | Production Next.js runtime; Vercel hosts the current production app. |

## Components and responsibilities

| Location | Responsibility |
|---|---|
| `app/page.tsx` | Server entry point that supplies the seeded pending notifications. |
| `components/ReviewQueue.tsx` | Selectable notification inbox, side-by-side review, verification, and browser-only decisions. |
| `lib/review-queue-storage.ts` | Zod-validated local-storage format for mock-inbox results, decisions, and rejection reasons. |
| `lib/mock-review-queue.ts` | Zod-validated, server-owned mock review data for eight fictional labels. |
| `app/api/reviews/batch/route.ts` | Batch request validation, mock-record lookup, bounded processing, and review response. |
| `lib/extractor.ts` | Server-only OpenAI client and structured vision extraction. |
| `lib/validation.ts` | Field comparisons plus warning and alcohol-content checks. |
| `lib/types.ts` | Shared Zod schemas and TypeScript data contracts. |
| `public/samples/` | Static fictional label artwork read by the batch route. |

## Security and operational boundaries

- `OPENAI_API_KEY` is read only by the server-side extraction module. It is never
  sent to the browser and must be configured as a deployment secret.
- The batch route accepts only known mock review IDs and reads matching bundled PNGs
  on the server.
- The current interface supports only the bundled mock-inbox workflow; it does not
  provide single-label or CSV upload controls.
- Mock-inbox extraction evidence, findings, and human Approve/Reject decisions are
  saved in browser local storage only, never sent back to the server, and are not
  shared with other users.
- The application is decision support, not an automatic approval system. Low
  confidence and visual-format uncertainty are returned as **Needs review**.
- This request-scoped prototype does not include a durable 1,000-job work queue.
  Production-scale throughput needs persisted jobs, provider rate limiting, retries,
  and monitoring.

## Deployment topology

The current production app is hosted on Vercel:
[janak-khadka-federal-build-challeng.vercel.app](https://janak-khadka-federal-build-challeng.vercel.app).

Vercel runs the Next.js application and provides the API route runtime. The route
calls the OpenAI API with the server-side `OPENAI_API_KEY`; static sample assets are
served directly from `public/samples`. The included `Dockerfile` supports an
equivalent self-hosted Node.js deployment.
