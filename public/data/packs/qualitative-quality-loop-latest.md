# Qualitative quality loop — 2026-11-09T20:37:20.849333+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7508`
- Suspects before → after: `81` → `33`
- QA reviewed / changed: `81` / `48`
- Findings applied: `64`
- Learned phrases added: `18`
- Merged to index: `True`
- Apply trigger: `eventCount +59 (>= 15)`

- Corpus sweep: `phrase fingerprint changed (00a67bb0→65f33fd2)`
- Chrome offerings removed: `0` across `0` schools (7508 shards scanned)

## Top flag counts (before)

- `chrome`: 45
- `cms_chrome`: 14
- `admissions`: 13
- `high_score_thin_signals`: 4
- `implausible_offerings`: 4
- `policy_toc`: 2
- `boilerplate`: 1

## Notes

- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '65f33fd26f2b14d71277', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11176, 'updatedAt': '2026-11-09', 'chromeDenylistCount': 9}
- Apply decision: eventCount +59 (>= 15)
- Corpus sweep decision: phrase fingerprint changed (00a67bb0→65f33fd2)
- Corpus sweep removed 0 chrome offering(s) from 0 school(s) across 7508 shards.
- Hydrated working sidecar from 7508 published URN shards (prior=0 → 7508).
- Before: 81 suspects across 7508 records.
- Applied QA fixes to 48 school(s) (64 area finding(s)).
- Learned 18 new junk phrase(s) (store size 900).
- Reviewed top 81 suspect(s); provider=none.
- Merged cleaned sidecar into 57 schools-index file(s).
- After: 33 suspects across 7508 records.
- Updated output/learned-qa-apply-state.json
