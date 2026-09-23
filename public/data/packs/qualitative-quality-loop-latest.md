# Qualitative quality loop — 2026-09-23T14:38:12.195282+00:00

- Mode: `skip`
- Provider: `none`
- Limit / min-score: `250` / `1.5`
- Records: `4153`
- Suspects before → after: `24` → `24`
- QA reviewed / changed: `0` / `0`
- Findings applied: `0`
- Learned phrases added: `0`
- Merged to index: `False`
- Apply trigger: `active phrase hash changed but phraseCount delta 0 < 5 (treat as minor rebalance)`

## Top flag counts (before)

- `implausible_offerings`: 17
- `admissions`: 7

## Notes

- Hydrated working sidecar from 4153 published URN shards (prior=0 → 4153).
- Rebalanced learned QA phrases: active=900 candidates=1445.
- Learning fingerprint: {'phraseHash': '4528dc3d027f65734f0c', 'phraseCount': 900, 'candidateCount': 1445, 'eventCount': 6817, 'updatedAt': '2026-09-23'}
- Apply decision: active phrase hash changed but phraseCount delta 0 < 5 (treat as minor rebalance)
- Before: 24 suspects across 4153 records.
- Skipped full apply — learning library unchanged (and within periodic max age). Analyse-only digest.
