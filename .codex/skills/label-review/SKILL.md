---
name: label-review
description: Implement or revise AI-assisted alcohol-label extraction, deterministic field validation, fixture coverage, and reviewer-facing outcomes for this repository. Use when changing the label review workflow, warning checks, OpenAI extraction contract, or test labels.
---

# Label review workflow

1. Read `references/ttb-warning.md` before changing warning logic.
2. Keep model output to extracted evidence and visual observations. Never ask the model to approve, reject, or interpret policy.
3. Validate every provider response with the shared Zod extraction schema. Convert incomplete or uncertain evidence to `needs_review`.
4. Use normalized semantic comparisons only for applicant-provided fields. Keep warning wording checks exact after whitespace normalization.
5. Add or update a synthetic fixture and a unit test for each changed rule. Do not use real applicant labels or PII.
6. Preserve the three outcomes: `pass`, `needs_review`, and `mismatch`; no automatic compliance decision is allowed.
