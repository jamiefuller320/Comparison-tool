# Qualitative quality loop — 2026-11-26T19:36:54.821581+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `8027`
- Suspects before → after: `41` → `35`
- QA reviewed / changed: `41` / `6`
- Findings applied: `6`
- Learned phrases added: `0`
- Merged to index: `True`
- Apply trigger: `periodic ceiling: last full apply 7.0d ago (>= 7d)`

- Corpus sweep: `phrase fingerprint unchanged`
- Chrome offerings removed: `0` across `0` schools (0 shards scanned)

## Top flag counts (before)

- `cms_chrome`: 14
- `admissions`: 13
- `chrome`: 6
- `high_score_thin_signals`: 4
- `implausible_offerings`: 4

## Notes

- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'c1cab978c0b2fcec967e', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11828, 'updatedAt': '2026-11-26', 'chromeDenylistCount': 9}
- Apply decision: periodic ceiling: last full apply 7.0d ago (>= 7d)
- Corpus sweep decision: phrase fingerprint unchanged
- Hydrated working sidecar from 8027 published URN shards (prior=0 → 8027).
- Before: 41 suspects across 8027 records.
- Applied QA fixes to 6 school(s) (6 area finding(s)).
- Learned 0 new junk phrase(s) (store size 900).
- Reviewed top 41 suspect(s); provider=none.
- Merged cleaned sidecar into 57 schools-index file(s).
- After: 35 suspects across 8027 records.
- Updated output/learned-qa-apply-state.json
