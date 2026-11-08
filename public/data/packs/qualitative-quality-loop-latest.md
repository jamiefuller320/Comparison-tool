# Qualitative quality loop — 2026-11-08T16:46:51.029321+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7383`
- Suspects before → after: `38` → `32`
- QA reviewed / changed: `38` / `6`
- Findings applied: `6`
- Learned phrases added: `0`
- Merged to index: `True`
- Apply trigger: `eventCount +16 (>= 15)`

- Corpus sweep: `phrase fingerprint unchanged`
- Chrome offerings removed: `0` across `0` schools (0 shards scanned)

## Top flag counts (before)

- `cms_chrome`: 14
- `admissions`: 13
- `chrome`: 6
- `high_score_thin_signals`: 4
- `implausible_offerings`: 1

## Notes

- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '00a67bb08bd66dd734e2', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11110, 'updatedAt': '2026-11-08', 'chromeDenylistCount': 9}
- Apply decision: eventCount +16 (>= 15)
- Corpus sweep decision: phrase fingerprint unchanged
- Hydrated working sidecar from 7383 published URN shards (prior=0 → 7383).
- Before: 38 suspects across 7383 records.
- Applied QA fixes to 6 school(s) (6 area finding(s)).
- Learned 0 new junk phrase(s) (store size 900).
- Reviewed top 38 suspect(s); provider=none.
- Merged cleaned sidecar into 57 schools-index file(s).
- After: 32 suspects across 7383 records.
- Updated output/learned-qa-apply-state.json
