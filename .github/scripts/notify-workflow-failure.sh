#!/usr/bin/env bash
# Open or comment on an open workflow-failure issue for a named workflow run.
set -euo pipefail

workflow_name="${1:?workflow display name required}"

issue_title="[workflow-failure] ${workflow_name}"
run_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT
cat >"$body_file" <<EOF
Scheduled or manual GitHub Actions run **failed**.

- **Workflow:** \`${workflow_name}\` (\`${GITHUB_WORKFLOW}\`)
- **Run:** ${run_url}
- **Ref:** \`${GITHUB_REF_NAME:-$GITHUB_REF}\`
- **Event:** \`${GITHUB_EVENT_NAME}\`
- **SHA:** \`${GITHUB_SHA}\`
EOF

gh label create workflow-failure \
  --color b60205 \
  --description "A scheduled or maintenance workflow failed" \
  2>/dev/null || true

existing="$(
  gh issue list \
    --label workflow-failure \
    --state open \
    --limit 100 \
    --json number,title \
    --jq ".[] | select(.title == \"${issue_title}\") | .number" \
    | head -n1
)"

if [ -n "$existing" ]; then
  gh issue comment "$existing" --body-file "$body_file"
  echo "Commented on open workflow-failure issue #${existing}"
else
  gh issue create \
    --title "$issue_title" \
    --label workflow-failure \
    --body-file "$body_file" \
    || gh issue create \
      --title "$issue_title" \
      --body-file "$body_file"
  echo "Opened workflow-failure issue: ${issue_title}"
fi
