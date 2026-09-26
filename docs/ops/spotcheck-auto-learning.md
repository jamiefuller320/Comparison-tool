# Spot-check auto-learning (ops)

Repo mirror of the project doc. Authoritative narrative for product ops lives in the School Compass project store (`docs/spotcheck-auto-learning.md`).

## Closed loop

`coverage (~07:00) → quality apply (10:00) → spot-check (12:00) → safe auto-learn → next quality apply`

- Spot-check is **sample-capped** (default 7, hard max 21) — does not scale to the full corpus.
- Auto-learns only high-confidence chrome / PDF / nav (denylist, PDF crumbs, already-learned reconfirms).
- Ethos underclaim and ambiguous candidates stay human-gated.

## Entry points

| Path | Role |
| --- | --- |
| `scripts/qualitative_spotcheck.py` | Sample, assess, partition auto vs gated, record safe learnings |
| `scripts/run-qualitative-spotcheck-loop.py` | CLI (`--auto-learn` default on, `--no-auto-learn`, `--record-flags`) |
| `.github/workflows/qualitative-spotcheck-loop.yml` | Schedule + dispatch; commits digest/learned store; `gh workflow run` quality when `qualityApplyRequested` |
| `output/spotcheck-human-gated-candidates.jsonl` | Human gate → `npm run qa:human-flags` |

```bash
npm run loop:qualitative-spotcheck
npm run loop:qualitative-spotcheck -- --no-auto-learn
npm run test:qualitative-spotcheck-loop
```
