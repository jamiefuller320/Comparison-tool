# Qualitative quality loop — 2026-11-12T18:10:14.952170+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7876`
- Suspects before → after: `73` → `34`
- QA reviewed / changed: `73` / `39`
- Findings applied: `44`
- Learned phrases added: `10`
- Merged to index: `True`
- Apply trigger: `eventCount +59 (>= 15)`

- Corpus sweep: `phrase fingerprint changed (da768f53→10a62ad4)`
- Chrome offerings removed: `0` across `0` schools (7876 shards scanned)

## Top flag counts (before)

- `chrome`: 35
- `cms_chrome`: 14
- `admissions`: 13
- `implausible_offerings`: 5
- `high_score_thin_signals`: 4
- `boilerplate`: 2
- `policy_toc`: 2

## Notes

- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '10a62ad44e0efa6a4eae', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11581, 'updatedAt': '2026-11-12', 'chromeDenylistCount': 9}
- Apply decision: eventCount +59 (>= 15)
- Corpus sweep decision: phrase fingerprint changed (da768f53→10a62ad4)
- Corpus sweep removed 0 chrome offering(s) from 0 school(s) across 7876 shards.
- Hydrated working sidecar from 7876 published URN shards (prior=0 → 7876).
- Before: 73 suspects across 7876 records.
- Applied QA fixes to 39 school(s) (44 area finding(s)).
- Learned 10 new junk phrase(s) (store size 900).
- Reviewed top 73 suspect(s); provider=none.
- Merged cleaned sidecar into 57 schools-index file(s).
- After: 34 suspects across 7876 records.
- Updated output/learned-qa-apply-state.json
