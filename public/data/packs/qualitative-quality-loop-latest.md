# Qualitative quality loop — 2026-09-04T13:58:19.181497+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `1511`
- Suspects before → after: `92` → `12`
- QA reviewed / changed: `92` / `80`
- Findings applied: `107`
- Learned phrases added: `35`
- Merged to index: `True`
- Apply trigger: `eventCount +92 (>= 15)`

## Top flag counts (before)

- `chrome`: 71
- `implausible_offerings`: 18
- `policy_toc`: 10
- `boilerplate`: 5
- `admissions`: 4
- `cms_chrome`: 2

## Notes

- Hydrated working sidecar from 1511 published URN shards (prior=0 → 1511).
- Rebalanced learned QA phrases: active=600 candidates=863.
- Learning fingerprint: {'phraseHash': 'f6f3e5b0439afca2f386', 'phraseCount': 600, 'candidateCount': 863, 'eventCount': 3776, 'updatedAt': '2026-09-04'}
- Apply decision: eventCount +92 (>= 15)
- Before: 92 suspects across 1511 records.
- Applied QA fixes to 80 school(s) (107 area finding(s)).
- Learned 35 new junk phrase(s) (store size 600).
- Reviewed top 92 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 12 suspects across 1511 records.
- Updated output/learned-qa-apply-state.json
