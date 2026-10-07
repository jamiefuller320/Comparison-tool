# Qualitative quality loop — 2026-10-07T17:20:19.986455+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `6601`
- Suspects before → after: `84` → `30`
- QA reviewed / changed: `84` / `54`
- Findings applied: `65`
- Learned phrases added: `18`
- Merged to index: `True`
- Apply trigger: `eventCount +73 (>= 15)`

## Top flag counts (before)

- `chrome`: 46
- `admissions`: 13
- `cms_chrome`: 13
- `implausible_offerings`: 6
- `boilerplate`: 5
- `policy_toc`: 5
- `high_score_thin_signals`: 4

## Notes

- Hydrated working sidecar from 6601 published URN shards (prior=0 → 6601).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '294c97cd5ad8f7aaed48', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10031, 'updatedAt': '2026-10-07'}
- Apply decision: eventCount +73 (>= 15)
- Before: 84 suspects across 6601 records.
- Applied QA fixes to 54 school(s) (65 area finding(s)).
- Learned 18 new junk phrase(s) (store size 900).
- Reviewed top 84 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 6601 records.
- Updated output/learned-qa-apply-state.json
