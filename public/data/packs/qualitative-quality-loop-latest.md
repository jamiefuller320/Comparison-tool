# Qualitative quality loop — 2026-11-10T17:44:52.571304+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7632`
- Suspects before → after: `77` → `33`
- QA reviewed / changed: `77` / `54`
- Findings applied: `61`
- Learned phrases added: `9`
- Merged to index: `True`
- Apply trigger: `eventCount +53 (>= 15)`

- Corpus sweep: `phrase fingerprint changed (8c66a774→52424fb8)`
- Chrome offerings removed: `0` across `0` schools (7632 shards scanned)

## Top flag counts (before)

- `chrome`: 41
- `cms_chrome`: 14
- `admissions`: 13
- `high_score_thin_signals`: 4
- `implausible_offerings`: 3
- `boilerplate`: 2
- `policy_toc`: 1

## Notes

- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '52424fb888147fc1f8d4', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11312, 'updatedAt': '2026-11-10', 'chromeDenylistCount': 9}
- Apply decision: eventCount +53 (>= 15)
- Corpus sweep decision: phrase fingerprint changed (8c66a774→52424fb8)
- Corpus sweep removed 0 chrome offering(s) from 0 school(s) across 7632 shards.
- Hydrated working sidecar from 7632 published URN shards (prior=0 → 7632).
- Before: 77 suspects across 7632 records.
- Applied QA fixes to 54 school(s) (61 area finding(s)).
- Learned 9 new junk phrase(s) (store size 900).
- Reviewed top 77 suspect(s); provider=none.
- Merged cleaned sidecar into 57 schools-index file(s).
- After: 33 suspects across 7632 records.
- Updated output/learned-qa-apply-state.json
