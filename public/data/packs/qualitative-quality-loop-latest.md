# Qualitative quality loop — 2026-09-20T13:58:17.307225+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `4107`
- Suspects before → after: `42` → `24`
- QA reviewed / changed: `42` / `18`
- Findings applied: `22`
- Learned phrases added: `6`
- Merged to index: `True`
- Apply trigger: `eventCount +54 (>= 15)`

## Top flag counts (before)

- `chrome`: 17
- `implausible_offerings`: 17
- `admissions`: 7
- `cms_chrome`: 1

## Notes

- Hydrated working sidecar from 4107 published URN shards (prior=0 → 4107).
- Rebalanced learned QA phrases: active=900 candidates=1424.
- Learning fingerprint: {'phraseHash': 'ff7daa2cc44aea18e22c', 'phraseCount': 900, 'candidateCount': 1424, 'eventCount': 6730, 'updatedAt': '2026-09-20'}
- Apply decision: eventCount +54 (>= 15)
- Before: 42 suspects across 4107 records.
- Applied QA fixes to 18 school(s) (22 area finding(s)).
- Learned 6 new junk phrase(s) (store size 900).
- Reviewed top 42 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 24 suspects across 4107 records.
- Updated output/learned-qa-apply-state.json
