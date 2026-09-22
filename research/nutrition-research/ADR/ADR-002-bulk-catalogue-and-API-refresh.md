# ADR-002: Bulk Catalogue and API Refresh

- Status: ACCEPTED
- Date: 2026-08-06

## Context

Making an FDC API request for every user search is slow and cost-unsafe,
and the FDC API has a per-IP rate limit (default 1,000 requests/hour) and
requires a key. Bulk CSV downloads are public and require no key.

## Decision

- Download official FDC bulk datasets (CSV/JSON) into
  `data/raw/usda/` and preserve them unchanged.
- Build a local, searchable, indexed nutrition catalogue (SQLite FTS5
  during development; PostgreSQL-compatible schema for production).
- The FDC API is used only for: search validation, individual record
  refresh, previously published branded versions, and records missing from
  the local release. The API client is server-only and never embedded in
  the app.
- Store the complete FDC release metadata: release date, source URL, file
  size, SHA-256, import time, importer version, row counts, rejected rows,
  validation errors.

## Consequences

- Catalogue updates are release-based with periodic refresh, not per-search.
- Appwrite stores only: source records used by confirmed meals, FDC IDs and
  provenance, bounded caches, user recipes, confirmed meal revisions, and
  reproducibility snapshots. The full catalogue is never placed in Appwrite.
- The raw catalogue is re-buildable deterministically from the checksummed
  archives.

## API client rules

- Read `USDA_FDC_API_KEY` from environment only; never `DEMO_KEY` in prod.
- Timeout, bounded retry with jitter, HTTP 429 handling, and
  `X-RateLimit-Limit` / `X-RateLimit-Remaining` monitoring.
- Response validation, structured errors, safe logging, caching.
