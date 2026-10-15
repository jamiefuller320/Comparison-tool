# Qualitative quality loop — 2026-10-15T14:52:29.790454+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7118`
- Suspects before → after: `35` → `30`
- QA reviewed / changed: `35` / `5`
- Findings applied: `5`
- Learned phrases added: `5`
- Merged to index: `True`
- Apply trigger: `eventCount +18 (>= 15)`

## Top flag counts (before)

- `admissions`: 13
- `cms_chrome`: 12
- `chrome`: 5
- `high_score_thin_signals`: 4
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7118 published URN shards (prior=0 → 7118).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '9fb532acf1da7a7ae4fc', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10629, 'updatedAt': '2026-10-15'}
- Apply decision: eventCount +18 (>= 15)
- Before: 35 suspects across 7118 records.
- Applied QA fixes to 5 school(s) (5 area finding(s)).
- Learned 5 new junk phrase(s) (store size 900).
- Reviewed top 35 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 7118 records.
- Updated output/learned-qa-apply-state.json
