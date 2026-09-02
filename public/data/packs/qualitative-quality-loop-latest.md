# Qualitative quality loop — 2026-09-02T14:02:00.998706+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `1151`
- Suspects before → after: `116` → `12`
- QA reviewed / changed: `116` / `105`
- Findings applied: `180`
- Learned phrases added: `46`
- Merged to index: `True`
- Apply trigger: `eventCount +106 (>= 15)`

## Top flag counts (before)

- `chrome`: 101
- `implausible_offerings`: 21
- `policy_toc`: 14
- `admissions`: 4
- `boilerplate`: 1

## Notes

- Hydrated working sidecar from 1151 published URN shards (prior=0 → 1151).
- Rebalanced learned QA phrases: active=600 candidates=721.
- Learning fingerprint: {'phraseHash': '363f85bd68999d7a56b5', 'phraseCount': 600, 'candidateCount': 721, 'eventCount': 3037, 'updatedAt': '2026-09-02'}
- Apply decision: eventCount +106 (>= 15)
- Before: 116 suspects across 1151 records.
- Applied QA fixes to 105 school(s) (180 area finding(s)).
- Learned 46 new junk phrase(s) (store size 600).
- Reviewed top 116 suspect(s); provider=none.
- Merged cleaned sidecar into 21 schools-index file(s).
- After: 12 suspects across 1151 records.
- Updated output/learned-qa-apply-state.json
