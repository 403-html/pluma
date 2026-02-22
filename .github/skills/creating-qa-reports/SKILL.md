---
name: creating-qa-reports
description: Produce a canonical, copy-pasteable QA report for PRs
---
This skill produces a canonical, copy-pasteable QA report used as the authoritative QA artifact for PRs.

Usage:
- Agents (QA, Lead) MUST call this skill when a QA run completes and when attaching QA output to a PR.

Required output format:
1. A single-line final status exactly matching one of:

Final QA Status: PASS

or

Final QA Status: FAIL

2. A short summary paragraph (1-3 sentences).
3. An itemized findings list with severity tags (blocker/major/minor/info). Prefer short lines.
4. A screenshots section rendered as a markdown table when any visual or UI/UX-impacting change exists.
  1. It should have always two columns: `Changes` and `Screenshot`

- Each row must describe the change (one line) and include a single markdown image link or artifact link in the `Screenshot` column.
- If there are no screenshots, include the header and one row with `No screenshots` / `-`.
- Do not embed large base64 blobs. Prefer artifact uploads or repository-relative paths.

Example output (minimal):

```markdown
Final QA Status: PASS

Summary: E2E flows pass; no regressions found in feature X.

- [minor] Tooltip text adjusted for clarity.
- [info] Performance metrics unchanged.

| Changes | Screenshot |
|---|---|
| Updated tooltip text on Flag list | ![flag-tooltip](artifacts/flag-tooltip.png) |
```

Agents should produce this final block verbatim (no extra narrative) and include it in the PR description and the PR QA comment. The `lead` agent is responsible for ensuring the report is present and accurate before closing the ticket.