#!/usr/bin/env bash
# Rebase onto origin/main and push, resolving conflicts on generated qualitative
# data files by keeping the commit being applied (rebase "theirs").
# Other conflicts abort so humans can investigate.
set -euo pipefail

REMOTE="${1:-origin}"
BRANCH="${2:-main}"
MAX_ATTEMPTS="${3:-5}"

# Paths both qualitative capture + quality loops rewrite on every run.
is_qualitative_data_path() {
  local path="$1"
  case "$path" in
    output/qualitative-*|output/learned-qa-patterns.json|output/learned-url-terms.json|public/data/schools-index.json|public/data/packs/qualitative-*)
      return 0
    ;;
  esac
  return 1
}

resolve_digest_conflicts() {
  local conflicted
  conflicted="$(git diff --name-only --diff-filter=U || true)"
  if [ -z "$conflicted" ]; then
    return 1
  fi

  local unresolved=()
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    if is_qualitative_data_path "$path"; then
      # During rebase, --theirs is the commit being replayed (this job's output).
      git checkout --theirs -- "$path"
      git add -- "$path"
    else
      unresolved+=("$path")
    fi
  done <<< "$conflicted"

  if [ "${#unresolved[@]}" -gt 0 ]; then
    echo "Unresolved rebase conflicts (not qualitative data files):" >&2
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
