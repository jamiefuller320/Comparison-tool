# Qualitative quality loop — 2026-10-12T19:47:13.151362+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7033`
- Suspects before → after: `45` → `30`
- QA reviewed / changed: `45` / `15`
- Findings applied: `15`
- Learned phrases added: `3`
- Merged to index: `True`
- Apply trigger: `eventCount +43 (>= 15)`

## Top flag counts (before)

- `chrome`: 15
- `admissions`: 13
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7033 published URN shards (prior=0 → 7033).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '1db8fefaaf58b9a35927', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10506, 'updatedAt': '2026-10-12'}
- Apply decision: eventCount +43 (>= 15)
- Before: 45 suspects across 7033 records.
- Applied QA fixes to 15 school(s) (15 area finding(s)).
- Learned 3 new junk phrase(s) (store size 900).
- Reviewed top 45 suspect(s); provider=none.
- Merged cleaned sidecar into 54 schools-index file(s).
- After: 30 suspects across 7033 records.
- Updated output/learned-qa-apply-state.json
