# Qualitative quality loop — 2026-10-02T16:14:08.164018+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `5753`
- Suspects before → after: `107` → `29`
- QA reviewed / changed: `107` / `78`
- Findings applied: `113`
- Learned phrases added: `27`
- Merged to index: `True`
- Apply trigger: `eventCount +58 (>= 15)`

## Top flag counts (before)

- `chrome`: 72
- `admissions`: 12
- `cms_chrome`: 12
- `implausible_offerings`: 12
- `policy_toc`: 11
- `high_score_thin_signals`: 4
- `boilerplate`: 3

## Notes

- Hydrated working sidecar from 5753 published URN shards (prior=0 → 5753).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'fd2533f1a96f4efa0b95', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 8854, 'updatedAt': '2026-10-02'}
- Apply decision: eventCount +58 (>= 15)
- Before: 107 suspects across 5753 records.
- Applied QA fixes to 78 school(s) (113 area finding(s)).
- Learned 27 new junk phrase(s) (store size 900).
- Reviewed top 107 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 29 suspects across 5753 records.
- Updated output/learned-qa-apply-state.json
