# Qualitative quality loop — 2026-11-11T17:53:26.949756+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7754`
- Suspects before → after: `70` → `35`
- QA reviewed / changed: `70` / `36`
- Findings applied: `49`
- Learned phrases added: `9`
- Merged to index: `True`
- Apply trigger: `eventCount +61 (>= 15)`

- Corpus sweep: `phrase fingerprint changed (0db6c6cc→97e7255c)`
- Chrome offerings removed: `0` across `4` schools (7754 shards scanned)

## Corpus sweep sample

- `143207` Lift Berkeley: —
- `145729` Lift Cam Woodfield Junior: —
- `150052` Lift Callowell: —
- `152685` Lift Hillview: —

## Top flag counts (before)

- `chrome`: 36
- `cms_chrome`: 14
- `admissions`: 13
- `high_score_thin_signals`: 4
- `implausible_offerings`: 3
- `boilerplate`: 2

## Notes

- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '97e7255cb6fea03f8b9b', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11451, 'updatedAt': '2026-11-11', 'chromeDenylistCount': 9}
- Apply decision: eventCount +61 (>= 15)
- Corpus sweep decision: phrase fingerprint changed (0db6c6cc→97e7255c)
- Corpus sweep removed 0 chrome offering(s) from 4 school(s) across 7754 shards.
- Hydrated working sidecar from 7754 published URN shards (prior=0 → 7754).
- Before: 70 suspects across 7754 records.
- Applied QA fixes to 36 school(s) (49 area finding(s)).
- Learned 9 new junk phrase(s) (store size 900).
- Reviewed top 70 suspect(s); provider=none.
- Merged cleaned sidecar into 57 schools-index file(s).
- After: 35 suspects across 7754 records.
- Updated output/learned-qa-apply-state.json
