# Qualitative quality loop — 2026-09-07T15:29:41.736662+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `2051`
- Suspects before → after: `50` → `13`
- QA reviewed / changed: `50` / `37`
- Findings applied: `39`
- Learned phrases added: `9`
- Merged to index: `True`
- Apply trigger: `eventCount +47 (>= 15)`

## Top flag counts (before)

- `chrome`: 34
- `implausible_offerings`: 10
- `admissions`: 5
- `policy_toc`: 2
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 2051 published URN shards (prior=0 → 2051).
- Rebalanced learned QA phrases: active=784 candidates=953.
- Learning fingerprint: {'phraseHash': '9b7d223c046aa7dce75c', 'phraseCount': 784, 'candidateCount': 953, 'eventCount': 4247, 'updatedAt': '2026-09-07'}
- Apply decision: eventCount +47 (>= 15)
- Before: 50 suspects across 2051 records.
- Applied QA fixes to 37 school(s) (39 area finding(s)).
- Learned 9 new junk phrase(s) (store size 792).
- Reviewed top 50 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 13 suspects across 2051 records.
- Updated output/learned-qa-apply-state.json
