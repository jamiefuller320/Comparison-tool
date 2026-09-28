# Qualitative quality loop — 2026-09-28T18:04:42.619833+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `5033`
- Suspects before → after: `92` → `30`
- QA reviewed / changed: `92` / `63`
- Findings applied: `82`
- Learned phrases added: `19`
- Merged to index: `True`
- Apply trigger: `eventCount +67 (>= 15)`

## Top flag counts (before)

- `chrome`: 60
- `admissions`: 12
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `implausible_offerings`: 4
- `policy_toc`: 3
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 5033 published URN shards (prior=0 → 5033).
- Rebalanced learned QA phrases: active=900 candidates=1903.
- Learning fingerprint: {'phraseHash': 'd1ba58d0da2a7d8800da', 'phraseCount': 900, 'candidateCount': 1903, 'eventCount': 8087, 'updatedAt': '2026-09-28'}
- Apply decision: eventCount +67 (>= 15)
- Before: 92 suspects across 5033 records.
- Applied QA fixes to 63 school(s) (82 area finding(s)).
- Learned 19 new junk phrase(s) (store size 900).
- Reviewed top 92 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 5033 records.
- Updated output/learned-qa-apply-state.json
