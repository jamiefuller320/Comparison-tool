# Human-gated review digest (ops)

Weekly collation of **open human-gated** qualitative improvement signals into one
reviewable digest — not only scattered JSONL / GitHub issues.

## Schedule

- GitHub Action: `.github/workflows/human-gated-review.yml`
- Cron: **Mondays 14:00 UTC** (after daily feedback → quality → spot-check)
- Manual: Actions → Human-gated review digest → Run workflow

## Commands

```bash
npm run review:human-gated                 # collate + write digest/queue
npm run review:human-gated -- --dry-run
npm run review:human-gated -- --open-issue # optional weekly summary issue
npm run review:human-gated -- --mark-done <id>
npm run review:human-gated -- --mark-done-feedback <uuid>
npm run review:human-gated -- --auto-close-learned
npm run test:human-gated-review
```

Alias: `npm run digest:human-gated`.

## Artefacts

| Path | Role |
| --- | --- |
| `public/data/packs/human-gated-review-latest.{json,md}` | Latest open-item digest |
| `output/human-gated-review-queue.jsonl` | Durable pending/done ledger |

## Review / mark done

1. Ambiguous chrome → `npm run qa:human-flags -- --jsonl …` then `loop:qualitative-quality -- --force`
2. Ethos / underclaim → targeted URN recapture (not phrase strip)
3. Parent improvement flags → `npm run feedback:process -- done <id>`
4. Ledger → `npm run review:human-gated -- --mark-done <id>`

Sources (once producers land): spot-check gated JSONL (#203), user-improvement gated JSONL (#204), spot-check digest `possible_underclaim` / `unsupported_offerings`, open `[user-improvement]` issues.

Full narrative: project store `docs/human-gated-review.md`.
