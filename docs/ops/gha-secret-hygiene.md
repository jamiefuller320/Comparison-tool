# GitHub Actions secret hygiene

This repo is **public**. Any `workflow_run` job runs in the base-repo context and
receives the default `GITHUB_TOKEN` (and repository secrets when configured). Treat
PR head branch names, fork commits, and `repository_dispatch` payloads as **untrusted input**.

Same monitoring pattern as [value_investor](https://github.com/jamiefuller320/value_investor)
(`gha-secret-hygiene.yml` + static scanner).

## High-risk patterns (blocked)

| Pattern | Risk | Mitigation in this repo |
|---------|------|-------------------------|
| `workflow_run` after PR CI, then `${{ github.event.workflow_run.head_branch }}` inside `run:` | Shell injection → token / secret theft | Pass via `env:` + strict regex; never `${{ }}` into the script body |
| `workflow_run` without a same-repo gate | Public **fork** PRs trigger privileged jobs | Require `head_repository.full_name == github.repository` |
| `${{ github.event.inputs.* }}` or `${{ inputs.* }}` inside `run:` | Shell injection when a write PAT can dispatch | Pass all inputs via `env:` (and allowlist) |
| `${{ github.event.client_payload.* }}` inside `run:` | Same injection class via `repository_dispatch` | Resolve in a prior step via `env:` |
| `${{ steps.*.outputs.* }}` inside `run:` when output carries dispatch/input data | Shell injection / commit message poisoning | Pass via `env:` after validation |
| Logging full API keys | Key leak via Actions logs | Log presence only (`keyPresent: true`), never values |

## Known client-side exposure (warning, not blocked)

`deploy-pages.yml` bakes `NEXT_PUBLIC_MISSING_SCHOOL_DISPATCH_TOKEN` into the static
bundle so the live site can queue `repository_dispatch` events without a backend.

This is intentional but **visible to every visitor**:

- Use a **fine-grained PAT** scoped only to `repository_dispatch` on this repo
- Workflows enforce rate limits (one force-refresh / LA pack per UTC day)
- Rotate the PAT if abuse is suspected
- Longer term: proxy dispatches through a serverless endpoint with server-side auth

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also public by design (Supabase row-level security
must enforce access).

## Which secrets workflows use

| Secret | Workflows | Notes |
|--------|-----------|-------|
| `CURSOR_API_KEY` / `OPENAI_API_KEY` | `qualitative-loop`, `qualitative-quality-loop` | Schedule / trusted dispatch only; never on untrusted refs |
| `MISSING_SCHOOL_DISPATCH_TOKEN` | `deploy-pages` → client bundle | Fine-grained PAT; minimal scope |
| `CHALLENGE_INTAKE_TOKEN` | Intake workflows | Prefer private intake repo |
| `NEXT_PUBLIC_SUPABASE_*` | `deploy-pages`, `supabase-keep-alive` | Anon key is public; URL is not secret |

## Automated check

`gha-secret-hygiene.yml` runs:

1. **Daily** (~06:20 UTC via GitHub schedule)
2. **On PRs / pushes** that touch `.github/workflows/**` or the scanner
3. **Manual** `workflow_dispatch` with optional `force=true`

The daily job **skips** when no PRs were merged to `main` and no commits touched
`.github/workflows/` in the last **36 hours** (override with `force`).

Local commands:

```bash
python3 scripts/gha_secret_hygiene_cli.py check
python3 scripts/gha_secret_hygiene_cli.py schedule-gate --force
python3 scripts/test_gha_secret_hygiene.py
# or
npm run test:gha-secret-hygiene
```

## If a secret may already be compromised

1. Revoke the key at the provider (Cursor, OpenAI, GitHub PAT settings, Supabase).
2. Create a new key; update GitHub Actions secrets and redeploy Pages if the client bundle changed.
3. Review recent Actions runs for unexpected `repository_dispatch` or manual dispatches.
4. Confirm `main` workflow files were not modified by an unexpected actor.
5. Prefer branch protection on `main` so a stolen Actions token cannot silently plant an exfiltrating workflow.

## Related

- [README.md](../../README.md) — secret setup for dispatch token, Supabase, intake repo
- value_investor [docs/ops/gha-secret-hygiene.md](https://github.com/jamiefuller320/value_investor/blob/main/docs/ops/gha-secret-hygiene.md)
