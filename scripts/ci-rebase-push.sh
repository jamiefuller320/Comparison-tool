#!/usr/bin/env bash
# Rebase onto origin/main and push, resolving conflicts on generated digest/
# summary files by keeping the commit being applied (rebase "theirs").
# Other conflicts abort so humans can investigate.
set -euo pipefail

REMOTE="${1:-origin}"
BRANCH="${2:-main}"
MAX_ATTEMPTS="${3:-5}"

DIGEST_PATHS=(
  output/qualitative-qa-queue.json
  public/data/packs/qualitative-qa-latest.json
  public/data/packs/qualitative-qa-latest.md
  public/data/packs/qualitative-loop-latest.json
  public/data/packs/qualitative-loop-latest.md
  public/data/packs/qualitative-quality-loop-latest.json
  public/data/packs/qualitative-quality-loop-latest.md
)

resolve_digest_conflicts() {
  local conflicted
  conflicted="$(git diff --name-only --diff-filter=U || true)"
  if [ -z "$conflicted" ]; then
    return 1
  fi

  local unresolved=()
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    local known=0
    for digest in "${DIGEST_PATHS[@]}"; do
      if [ "$path" = "$digest" ]; then
        known=1
        break
      fi
    done
    if [ "$known" -eq 1 ]; then
      # During rebase, --theirs is the commit being replayed (this job's output).
      git checkout --theirs -- "$path"
      git add -- "$path"
    else
      unresolved+=("$path")
    fi
  done <<< "$conflicted"

  if [ "${#unresolved[@]}" -gt 0 ]; then
    echo "Unresolved rebase conflicts (not digest files):" >&2
    printf '  %s\n' "${unresolved[@]}" >&2
    git rebase --abort || true
    return 1
  fi

  GIT_EDITOR=true git rebase --continue
}

for i in $(seq 1 "$MAX_ATTEMPTS"); do
  if git pull --rebase "$REMOTE" "$BRANCH"; then
    if git push "$REMOTE" "HEAD:${BRANCH}"; then
      exit 0
    fi
  else
    if resolve_digest_conflicts && git push "$REMOTE" "HEAD:${BRANCH}"; then
      exit 0
    fi
    # Leave a dirty rebase state only briefly; abort before retrying.
    if [ -d "$(git rev-parse --git-path rebase-merge 2>/dev/null)" ] || \
       [ -d "$(git rev-parse --git-path rebase-apply 2>/dev/null)" ]; then
      git rebase --abort || true
    fi
  fi
  echo "Push attempt $i failed; retrying..."
  sleep $((i * 4))
done

echo "Failed to rebase/push after $MAX_ATTEMPTS attempts" >&2
exit 1
