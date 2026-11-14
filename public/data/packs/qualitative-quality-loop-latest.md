# Qualitative quality loop — 2026-11-14T16:38:52.614364+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `8016`
- Suspects before → after: `37` → `35`
- QA reviewed / changed: `37` / `3`
- Findings applied: `3`
- Learned phrases added: `3`
- Merged to index: `True`
- Apply trigger: `eventCount +17 (>= 15)`

- Corpus sweep: `phrase fingerprint unchanged`
- Chrome offerings removed: `0` across `0` schools (0 shards scanned)

## Top flag counts (before)

- `cms_chrome`: 14
- `admissions`: 13
- `high_score_thin_signals`: 4
- `implausible_offerings`: 4
- `chrome`: 3

## Notes

- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'c1cab978c0b2fcec967e', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11795, 'updatedAt': '2026-11-14', 'chromeDenylistCount': 9}
- Apply decision: eventCount +17 (>= 15)
- Corpus sweep decision: phrase fingerprint unchanged
- Hydrated working sidecar from 8016 published URN shards (prior=0 → 8016).
- Before: 37 suspects across 8016 records.
- Applied QA fixes to 3 school(s) (3 area finding(s)).
- Learned 3 new junk phrase(s) (store size 900).
- Reviewed top 37 suspect(s); provider=none.
- Merged cleaned sidecar into 57 schools-index file(s).
- After: 35 suspects across 8016 records.
- Updated output/learned-qa-apply-state.json
