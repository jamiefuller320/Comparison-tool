# Qualitative quality loop — 2026-10-22T14:52:34.590170+00:00

- Mode: `skip`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7381`
- Suspects before → after: `30` → `30`
- QA reviewed / changed: `0` / `0`
- Findings applied: `0`
- Learned phrases added: `0`
- Merged to index: `False`
- Apply trigger: `active phrase hash changed but phraseCount delta 0 < 5 (treat as minor rebalance)`

## Top flag counts (before)

- `admissions`: 13
- `cms_chrome`: 12
- `high_score_thin_signals`: 4
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7381 published URN shards (prior=0 → 7381).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '36c55f95d9d459be14b7', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10985, 'updatedAt': '2026-10-22'}
- Apply decision: active phrase hash changed but phraseCount delta 0 < 5 (treat as minor rebalance)
- Before: 30 suspects across 7381 records.
- Skipped full apply — learning library unchanged (and within periodic max age). Analyse-only digest.
