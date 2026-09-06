# Qualitative quality loop — 2026-09-06T13:23:29.002704+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `1871`
- Suspects before → after: `57` → `13`
- QA reviewed / changed: `57` / `44`
- Findings applied: `47`
- Learned phrases added: `9`
- Merged to index: `True`
- Apply trigger: `eventCount +67 (>= 15)`

## Top flag counts (before)

- `chrome`: 41
- `implausible_offerings`: 10
- `admissions`: 5
- `policy_toc`: 2
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 1871 published URN shards (prior=0 → 1871).
- Rebalanced learned QA phrases: active=768 candidates=937.
- Learning fingerprint: {'phraseHash': '6df8ae7468fa826d4f04', 'phraseCount': 768, 'candidateCount': 937, 'eventCount': 4144, 'updatedAt': '2026-09-06'}
- Apply decision: eventCount +67 (>= 15)
- Before: 57 suspects across 1871 records.
- Applied QA fixes to 44 school(s) (47 area finding(s)).
- Learned 9 new junk phrase(s) (store size 777).
- Reviewed top 57 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 13 suspects across 1871 records.
- Updated output/learned-qa-apply-state.json
