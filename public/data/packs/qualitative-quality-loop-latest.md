# Qualitative quality loop — 2026-11-19T19:07:17.489039+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `8026`
- Suspects before → after: `36` → `35`
- QA reviewed / changed: `36` / `1`
- Findings applied: `1`
- Learned phrases added: `0`
- Merged to index: `True`
- Apply trigger: `eventCount +20 (>= 15)`

- Corpus sweep: `phrase fingerprint unchanged`
- Chrome offerings removed: `0` across `0` schools (0 shards scanned)

## Top flag counts (before)

- `cms_chrome`: 14
- `admissions`: 13
- `high_score_thin_signals`: 4
- `implausible_offerings`: 4
- `chrome`: 1

## Notes

- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'c1cab978c0b2fcec967e', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11822, 'updatedAt': '2026-11-19', 'chromeDenylistCount': 9}
- Apply decision: eventCount +20 (>= 15)
- Corpus sweep decision: phrase fingerprint unchanged
- Hydrated working sidecar from 8026 published URN shards (prior=0 → 8026).
- Before: 36 suspects across 8026 records.
- Applied QA fixes to 1 school(s) (1 area finding(s)).
- Learned 0 new junk phrase(s) (store size 900).
- Reviewed top 36 suspect(s); provider=none.
- Merged cleaned sidecar into 57 schools-index file(s).
- After: 35 suspects across 8026 records.
- Updated output/learned-qa-apply-state.json
