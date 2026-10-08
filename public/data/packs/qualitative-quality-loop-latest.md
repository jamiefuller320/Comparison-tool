# Qualitative quality loop — 2026-10-08T17:20:14.941319+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `6720`
- Suspects before → after: `61` → `30`
- QA reviewed / changed: `61` / `31`
- Findings applied: `36`
- Learned phrases added: `12`
- Merged to index: `True`
- Apply trigger: `eventCount +60 (>= 15)`

## Top flag counts (before)

- `chrome`: 25
- `cms_chrome`: 14
- `admissions`: 13
- `high_score_thin_signals`: 4
- `implausible_offerings`: 4
- `policy_toc`: 3
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 6720 published URN shards (prior=0 → 6720).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '4ba827353024978d1d43', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10170, 'updatedAt': '2026-10-08'}
- Apply decision: eventCount +60 (>= 15)
- Before: 61 suspects across 6720 records.
- Applied QA fixes to 31 school(s) (36 area finding(s)).
- Learned 12 new junk phrase(s) (store size 900).
- Reviewed top 61 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 6720 records.
- Updated output/learned-qa-apply-state.json
