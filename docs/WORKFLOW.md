# Label Check workflow

This document describes the end-to-end behavior of the application. The system is
decision support: it extracts evidence and applies deterministic checks; a compliance
agent makes the final determination.

## Shared validation sequence

```mermaid
sequenceDiagram
    autonumber
    actor Agent as Compliance agent
    participant UI as Browser UI<br/>(Next.js)
    participant API as POST /api/reviews
    participant AI as OpenAI vision model
    participant Rules as Validation engine

    Agent->>UI: Provide application data and label image(s)
    UI->>API: Multipart request: images + expected fields
    API->>API: Validate file count, type, size, and input schema
    alt Request is invalid
        API-->>UI: 400 + plain-language error
        UI-->>Agent: Explain what needs correction
    else Each valid image
        API->>AI: Image + strict extraction schema
        AI-->>API: Visible label data and warning-format observations
        API->>API: Normalize provider artifacts (for example, string "null")
        API->>Rules: Compare application values and extracted evidence
        Rules-->>API: Per-field findings + Pass / Needs review / Mismatch
        API-->>UI: Independent result for every image
        UI-->>Agent: Show evidence, explanation, and elapsed time
    end
```

## Single-label workflow

```mermaid
sequenceDiagram
    autonumber
    actor Agent as Compliance agent
    participant UI as Single-label screen
    participant Samples as /public/samples
    participant API as POST /api/reviews

    alt Bundled sample selected
        Agent->>UI: Select a sample from the dropdown
        UI->>Samples: Fetch sample image from /samples/
        Samples-->>UI: Image shown in preview
        UI->>UI: Populate matching application fields
    else Own label selected
        Agent->>UI: Enter four required fields and choose image
        UI->>UI: Show image preview
    end

    Agent->>UI: Select Verify label
    UI->>API: Submit one image and application values
    API-->>UI: One ReviewResult
    UI-->>Agent: Show result banner, image thumbnail, and findings table
```

## Batch CSV workflow

```mermaid
sequenceDiagram
    autonumber
    actor Agent as Compliance agent
    participant UI as Batch screen
    participant CSV as CSV parser
    participant API as POST /api/reviews

    Agent->>UI: Upload applications CSV and label images
    UI->>CSV: Parse headers and application rows
    CSV-->>UI: Rows keyed by image filename + any CSV errors
    UI->>UI: Pair each row with an uploaded image by filename
    UI-->>Agent: Show Ready or Image missing status

    Agent->>UI: Select Start checking
    loop Up to three concurrent workers
        UI->>API: Submit one row's image and application values
        API-->>UI: Result or per-image error
        UI->>UI: Update that row's status and description
    end
    UI-->>Agent: Filterable table with result and explanation
    Agent->>UI: Select Export results CSV
    UI-->>Agent: Download result, timing, and description data
```

## Rule boundaries

- The model only transcribes visible evidence. It never decides approval or rejection.
- The validation engine performs text/field comparison, ABV and proof checks, and
  government-warning checks.
- Low-confidence extraction and visual uncertainty become **Needs review**.
- Uploads/results are request-scoped; the application has no persistence layer.
- Physical type size, layout, same-field-of-vision, and product-specific formula or
  import requirements remain agent review tasks.
