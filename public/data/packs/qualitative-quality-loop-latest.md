# Qualitative quality loop — 2026-09-25T15:05:34.270971+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `4493`
- Suspects before → after: `245` → `31`
- QA reviewed / changed: `245` / `218`
- Findings applied: `259`
- Learned phrases added: `265`
- Merged to index: `True`
- Apply trigger: `eventCount +41 (>= 15)`

## Top flag counts (before)

- `implausible_offerings`: 178
- `named_person`: 176
- `chrome`: 67
- `cms_chrome`: 16
- `admissions`: 12
- `high_score_thin_signals`: 4
- `boilerplate`: 3
- `policy_toc`: 2

## Notes

- Hydrated working sidecar from 4493 published URN shards (prior=0 → 4493).
- Rebalanced learned QA phrases: active=900 candidates=1553.
- Learning fingerprint: {'phraseHash': '47c9ac03806ca4c832fa', 'phraseCount': 900, 'candidateCount': 1553, 'eventCount': 7205, 'updatedAt': '2026-09-25'}
- Apply decision: eventCount +41 (>= 15)
- Before: 245 suspects across 4493 records.
- Applied QA fixes to 218 school(s) (259 area finding(s)).
- Learned 265 new junk phrase(s) (store size 900).
- Reviewed top 245 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 31 suspects across 4493 records.
- Updated output/learned-qa-apply-state.json
