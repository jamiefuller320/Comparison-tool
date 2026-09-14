# Qualitative quality loop — 2026-09-14T16:11:26.650927+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `324` / `1.5`
- Records: `3311`
- Suspects before → after: `324` → `19`
- QA reviewed / changed: `324` / `305`
- Findings applied: `409`
- Learned phrases added: `127`
- Merged to index: `True`
- Apply trigger: `eventCount +80 (>= 15)`

## Top flag counts (before)

- `chrome`: 279
- `implausible_offerings`: 66
- `policy_toc`: 54
- `admissions`: 8
- `boilerplate`: 6
- `cms_chrome`: 2
- `admissions_in_enrichment`: 1

## Notes

- Hydrated working sidecar from 3311 published URN shards (prior=0 → 3311).
- Rebalanced learned QA phrases: active=900 candidates=1111.
- Learning fingerprint: {'phraseHash': 'aa7b1b20c72ea311aee4', 'phraseCount': 900, 'candidateCount': 1111, 'eventCount': 4963, 'updatedAt': '2026-09-14'}
- Apply decision: eventCount +80 (>= 15)
- Before: 324 suspects across 3311 records.
- Raised review limit 250 → 324 to cover all suspects for full learning apply.
- Applied QA fixes to 305 school(s) (409 area finding(s)).
- Learned 127 new junk phrase(s) (store size 900).
- Reviewed top 324 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 19 suspects across 3311 records.
- Updated output/learned-qa-apply-state.json
