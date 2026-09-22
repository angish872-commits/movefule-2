# Packaged Food Boundary

This module is a backend-only exact-barcode source adapter.

- Barcode lookup creates a `NEEDS_REVIEW` candidate only.
- Open Food Facts is used read-only and retains source revision/provenance.
- Missing provider data remains unknown; it is never filled with zero.
- A milliliter serving is not converted to grams without independent density evidence.
- Not-found, malformed, timeout and network failures fall back to manual/search review.
- Provider output cannot confirm a meal. The existing explicit meal confirmation boundary remains authoritative.
