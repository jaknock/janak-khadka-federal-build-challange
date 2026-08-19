# Label Check workflow

This prototype provides decision support: it extracts visible evidence and applies
deterministic checks; a compliance agent makes the final determination.

## Mock notification and batch-review sequence

```mermaid
sequenceDiagram
    autonumber
    actor Agent as Compliance agent
    participant UI as Browser inbox<br/>(Next.js)
    participant Queue as Mock review database
    participant API as POST /api/reviews/batch
    participant AI as OpenAI vision model
    participant Rules as Validation engine

    Queue-->>UI: Six fictional pending notifications
    Agent->>UI: Select one or more applications, then verify
    UI->>API: JSON: pending review IDs
    API->>Queue: Validate and retrieve known records
    API->>API: Read bundled artwork for each record
    loop Up to eight concurrent analyses
        API->>AI: Label image + strict extraction schema
        AI-->>API: Visible label data and warning-format observations
        API->>Rules: Compare application values and extracted evidence
        Rules-->>API: Per-field findings + Pass / Needs review / Mismatch
    end
    API-->>UI: Independent result or error for every review
    UI-->>Agent: Clear pending count and show review evidence
```

## State boundaries

- `lib/mock-review-queue.ts` contains eight Zod-validated, fictional review records,
  including glare and skewed-photo scenarios that route uncertain evidence to review.
- The browser receives display data for the pending notifications and sends only the
  selected record IDs when batch verification starts.
- The batch API retrieves application data and reads matching artwork server-side.
  The browser never uploads the images or sees the OpenAI API key.
- `Open application` expands an in-inbox, side-by-side application and label review.
- Mock-inbox verification findings and human Approve/Reject decisions are validated
  before being restored from local storage and persist only in that browser. They are
  never sent to the server or shared with another reviewer.
- Selecting **Reject application** asks the agent to provide a reason. The reviewer
  must then use **Submit determination** to save the selected outcome. The editable
  suggestion is based on non-passing verification findings; the model never makes the
  rejection decision.
- Selections remain temporary. The agent can use **Reset this browser's demo state**
  to remove saved mock-inbox results and decisions.
- The model only transcribes visible evidence. It never decides approval or rejection.
  Low-confidence extraction and visual uncertainty become **Needs review**.

## Manual upload workflows

- **Upload one label:** the agent enters application data and selects one image. The
  browser sends multipart image data and expected fields to `POST /api/reviews`.
- **Upload CSV batch:** the agent provides an applications CSV and matching label
  images. The browser pairs rows by filename and sends each ready row to
  `POST /api/reviews`, up to three at a time. Each result records its server-side
  processing time against a five-second response target; a 15-second hard timeout
  prevents a stalled request from blocking a worker indefinitely.
- Manual uploads and their results are request-scoped. They are separate from the
  mock inbox and do not alter its seeded notification records.

## Rule boundaries

- The validation engine performs text/field comparison, ABV and proof checks, and
  government-warning checks.
- Physical type size, layout, same-field-of-vision, and product-specific formula or
  import requirements remain agent review tasks.
- The mock inbox runs all eight records concurrently for demo speed. Manual CSV uploads
  remain capped at three workers; a production high-volume workflow would require
  persistent jobs, rate-limit-aware retries, and monitoring.
