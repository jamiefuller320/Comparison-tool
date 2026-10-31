# Qualitative quality loop — 2026-10-31T15:37:37.836012+00:00

- Mode: `skip`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7381`
- Suspects before → after: `30` → `30`
- QA reviewed / changed: `0` / `0`
- Findings applied: `0`
- Learned phrases added: `0`
- Merged to index: `False`
- Apply trigger: `learning library unchanged since last apply`

## Top flag counts (before)

- `admissions`: 13
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7381 published URN shards (prior=0 → 7381).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': 'e80c91f285227ad8c878', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 11089, 'updatedAt': '2026-10-31'}
- Apply decision: learning library unchanged since last apply
- Before: 30 suspects across 7381 records.
- Skipped full apply — learning library unchanged (and within periodic max age). Analyse-only digest.
