# Qualitative quality loop — 2026-10-17T13:26:53.560634+00:00

- Mode: `skip`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `7126`
- Suspects before → after: `39` → `39`
- QA reviewed / changed: `0` / `0`
- Findings applied: `0`
- Learned phrases added: `0`
- Merged to index: `False`
- Apply trigger: `active phrase hash changed but phraseCount delta 0 < 5 (treat as minor rebalance)`

## Top flag counts (before)

- `admissions`: 13
- `cms_chrome`: 12
- `chrome`: 9
- `high_score_thin_signals`: 4
- `implausible_offerings`: 1

## Notes

- Hydrated working sidecar from 7126 published URN shards (prior=0 → 7126).
- Rebalanced learned QA phrases: active=900 candidates=2000.
- Learning fingerprint: {'phraseHash': '2619b284432f79a01823', 'phraseCount': 900, 'candidateCount': 2000, 'eventCount': 10653, 'updatedAt': '2026-10-17'}
- Apply decision: active phrase hash changed but phraseCount delta 0 < 5 (treat as minor rebalance)
- Before: 39 suspects across 7126 records.
- Skipped full apply — learning library unchanged (and within periodic max age). Analyse-only digest.
