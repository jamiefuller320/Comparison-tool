# Qualitative quality loop — 2026-11-13T17:44:26.878882+00:00

- Mode: `apply`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7990`
- Suspects before → after: `74` → `34`
- QA reviewed / changed: `74` / `40`
- Findings applied: `54`
- Learned phrases added: `25`
- Merged to index: `True`
- Apply trigger: `eventCount +58 (>= 15)`

- Corpus sweep: `phrase fingerprint changed (047607ef→a4cb247a)`
- Chrome offerings removed: `0` across `1` schools (7990 shards scanned)

## Corpus sweep sample

- `140220` Willowdown Primary School: —

## Top flag counts (before)

- `chrome`: 39
- `cms_chrome`: 14
- `admissions`: 13
- `high_score_thin_signals`: 4
- `boilerplate`: 3
- `implausible_offerings`: 3

## Notes

- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'a4cb247afc9f48648302', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11713, 'updatedAt': '2026-11-13', 'chromeDenylistCount': 9}
- Apply decision: eventCount +58 (>= 15)
- Corpus sweep decision: phrase fingerprint changed (047607ef→a4cb247a)
- Corpus sweep removed 0 chrome offering(s) from 1 school(s) across 7990 shards.
- Hydrated working sidecar from 7990 published URN shards (prior=0 → 7990).
- Before: 74 suspects across 7990 records.
- Applied QA fixes to 40 school(s) (54 area finding(s)).
- Learned 25 new junk phrase(s) (store size 900).
- Reviewed top 74 suspect(s); provider=none.
- Merged cleaned sidecar into 57 schools-index file(s).
- After: 34 suspects across 7990 records.
- Updated output/learned-qa-apply-state.json
