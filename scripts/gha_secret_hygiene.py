"""Static checks for GitHub Actions secret-exposure patterns.

Public-repo ``workflow_run`` jobs run with base-repo privileges. This module
flags dangerous patterns so CI / a daily scheduled job can fail closed.

Adapted from the value_investor repo hygiene scanner.
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

DEFAULT_WORKFLOWS_DIR = Path(".github/workflows")
DEFAULT_LOOKBACK_HOURS = 36

# Workflows that load paid API keys — must stay on trusted refs (main / schedule).
_SECRET_BEARING_ENV_KEYS = ("CURSOR_API_KEY", "OPENAI_API_KEY", "CHALLENGE_INTAKE_TOKEN")

# Expressions that must never appear inside ``run: |`` / ``run: >`` bodies.
_UNTRUSTED_RUN_INTERP = re.compile(
    r"\$\{\{\s*github\.event\."
    r"(?:pull_request\.head\.ref|workflow_run\.head_branch|workflow_run\.name)"
    r"\s*\}\}"
)

# workflow_dispatch inputs interpolated into run: enable shell injection when a
# write token / WORKFLOW_DISPATCH_PAT can dispatch (and later steps may load secrets).
_DISPATCH_INPUT_IN_RUN = re.compile(r"\$\{\{\s*(?:github\.event\.inputs|inputs)\.")

# repository_dispatch client_payload in run: — same injection class as dispatch inputs.
_CLIENT_PAYLOAD_IN_RUN = re.compile(r"\$\{\{\s*github\.event\.client_payload")

# Step outputs that often carry untrusted dispatch / input values.
_STEP_OUTPUT_IN_RUN = re.compile(r"\$\{\{\s*steps\.[^}]+\.outputs\.")

_WORKFLOW_RUN_TRIGGER = re.compile(r"(?m)^\s*workflow_run\s*:")
_HEAD_REPO_GATE = re.compile(r"head_repository\.full_name\s*==\s*github\.repository")
_EDITABLE_PIP = re.compile(r"pip\s+install\s+-e\b")
_USES_WORKFLOW_RUN_HEAD = re.compile(r"github\.event\.workflow_run\.(?:head_branch|head_sha)")
_CHECKOUT_UNTRUSTED_REF = re.compile(
    r"ref:\s*\$\{\{\s*github\.event\.workflow_run\.(?:head_branch|head_sha)\s*\}\}"
)

# Client bundle: NEXT_PUBLIC_* names that embed secrets are visible to all visitors.
_NEXT_PUBLIC_SENSITIVE = re.compile(
    r"NEXT_PUBLIC_(?:MISSING_SCHOOL_DISPATCH_TOKEN|[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY))"
)


@dataclass(frozen=True)
class HygieneFinding:
    severity: str  # "error" | "warning"
    path: str
    rule: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass
class HygieneReport:
    findings: list[HygieneFinding] = field(default_factory=list)
    scanned_files: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not any(item.severity == "error" for item in self.findings)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "error_count": sum(1 for item in self.findings if item.severity == "error"),
            "warning_count": sum(1 for item in self.findings if item.severity == "warning"),
            "scanned_files": list(self.scanned_files),
            "findings": [item.to_dict() for item in self.findings],
        }


@dataclass(frozen=True)
class ScheduleGateDecision:
    should_run: bool
    reason: str
    merged_pr_count: int = 0
    workflow_touch_count: int = 0
    lookback_hours: int = DEFAULT_LOOKBACK_HOURS

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def iter_workflow_files(workflows_dir: Path | None = None) -> list[Path]:
    root = Path(workflows_dir or DEFAULT_WORKFLOWS_DIR)
    if not root.is_dir():
        return []
    return sorted(path for path in root.glob("*.yml") if path.is_file()) + sorted(
        path for path in root.glob("*.yaml") if path.is_file()
    )


def extract_run_blocks(text: str) -> list[str]:
    """Return bodies of ``run: |`` / ``run: >`` steps (shell scripts only)."""
    blocks: list[str] = []
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        match = re.match(r"^(\s*)(?:-\s+)?run:\s*[|>]\s*$", lines[i])
        if not match:
            i += 1
            continue
        indent = len(match.group(1))
        i += 1
        body: list[str] = []
        while i < len(lines):
            line = lines[i]
            if line.strip() == "":
                body.append(line)
                i += 1
                continue
            leading = len(line) - len(line.lstrip(" "))
            if leading <= indent:
                break
            body.append(line)
            i += 1
        blocks.append("\n".join(body))
    return blocks


def _append_untrusted_run_finding(
    findings: list[HygieneFinding],
    *,
    path: str,
    rule: str,
    hit: re.Match[str],
    detail: str,
) -> None:
    findings.append(
        HygieneFinding(
            severity="error",
            path=path,
            rule=rule,
            message=f"{detail}: {hit.group(0)}. Pass via env: and validate with a strict regex.",
        )
    )


def scan_workflow_text(path: str, text: str) -> list[HygieneFinding]:
    findings: list[HygieneFinding] = []
    name = Path(path).name
    has_workflow_run = bool(_WORKFLOW_RUN_TRIGGER.search(text))
    uses_workflow_run_head = bool(_USES_WORKFLOW_RUN_HEAD.search(text))
    checks_out_untrusted_ref = bool(_CHECKOUT_UNTRUSTED_REF.search(text))
    has_same_repo_gate = bool(_HEAD_REPO_GATE.search(text))

    for block in extract_run_blocks(text):
        for pattern, rule, detail in (
            (_UNTRUSTED_RUN_INTERP, "untrusted_expr_in_run", "Untrusted GitHub expression inside run script"),
            (
                _DISPATCH_INPUT_IN_RUN,
                "dispatch_input_in_run",
                "workflow_dispatch input interpolated inside run script",
            ),
            (
                _CLIENT_PAYLOAD_IN_RUN,
                "client_payload_in_run",
                "repository_dispatch client_payload interpolated inside run script",
            ),
            (
                _STEP_OUTPUT_IN_RUN,
                "step_output_in_run",
                "Step output interpolated inside run script (often carries untrusted dispatch/input values)",
            ),
        ):
            hit = pattern.search(block)
            if hit:
                _append_untrusted_run_finding(
                    findings, path=path, rule=rule, hit=hit, detail=detail
                )

    if has_workflow_run and uses_workflow_run_head and not has_same_repo_gate:
        findings.append(
            HygieneFinding(
                severity="error",
                path=path,
                rule="workflow_run_missing_same_repo_gate",
                message=(
                    "workflow_run uses PR head fields without "
                    "head_repository.full_name == github.repository"
                ),
            )
        )

    if has_workflow_run and _EDITABLE_PIP.search(text) and checks_out_untrusted_ref:
        findings.append(
            HygieneFinding(
                severity="error",
                path=path,
                rule="editable_install_with_untrusted_checkout",
                message=(
                    "workflow_run job checks out PR head with ref: and uses pip install -e "
                    "(package code from the PR runs with write token)"
                ),
            )
        )

    # Warn when deploy bakes a dispatch PAT into the static client bundle.
    if name == "deploy-pages.yml":
        for match in _NEXT_PUBLIC_SENSITIVE.finditer(text):
            findings.append(
                HygieneFinding(
                    severity="warning",
                    path=path,
                    rule="next_public_sensitive_in_deploy",
                    message=(
                        f"{match.group(0)} is embedded in the static site bundle — "
                        "any visitor can read it. Use a fine-grained PAT with minimal "
                        "repository_dispatch scope and rotate if exposed."
                    ),
                )
            )

    # Workflows that load API keys must not checkout untrusted refs.
    loads_secrets = any(key in text for key in _SECRET_BEARING_ENV_KEYS)
    if loads_secrets and checks_out_untrusted_ref:
        findings.append(
            HygieneFinding(
                severity="error",
                path=path,
                rule="secrets_with_untrusted_checkout",
                message=(
                    "Workflow loads repository secrets but checks out an untrusted ref "
                    "(workflow_run head). Checkout main or a validated ref only."
                ),
            )
        )

    return findings


def scan_workflows(workflows_dir: Path | None = None) -> HygieneReport:
    report = HygieneReport()
    for path in iter_workflow_files(workflows_dir):
        rel = str(path).replace("\\", "/")
        report.scanned_files.append(rel)
        text = path.read_text(encoding="utf-8")
        report.findings.extend(scan_workflow_text(rel, text))
    return report


def _gh_api_json(
    url: str,
    *,
    token: str,
    accept: str = "application/vnd.github+json",
) -> Any:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": accept,
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "comparison-tool-gha-secret-hygiene",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API {exc.code} for {url}: {detail}") from exc


def _parse_repo(repo: str) -> tuple[str, str]:
    parts = (repo or "").strip().split("/")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError(f"repo must be owner/name, got {repo!r}")
    return parts[0], parts[1]


def count_merged_prs_since(
    *,
    repo: str,
    token: str,
    since: datetime,
    base: str = "main",
) -> int:
    owner, name = _parse_repo(repo)
    since_iso = since.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    query = f"repo:{owner}/{name} is:pr is:merged base:{base} merged:>={since_iso}"
    url = "https://api.github.com/search/issues?" + urllib.parse.urlencode(
        {"q": query, "per_page": "1"}
    )
    payload = _gh_api_json(url, token=token)
    return int(payload.get("total_count") or 0)


def count_workflow_commits_since(
    *,
    repo: str,
    token: str,
    since: datetime,
    branch: str = "main",
    path: str = ".github/workflows",
) -> int:
    owner, name = _parse_repo(repo)
    since_iso = since.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    url = f"https://api.github.com/repos/{owner}/{name}/commits?" + urllib.parse.urlencode(
        {
            "sha": branch,
            "since": since_iso,
            "path": path,
            "per_page": "100",
        }
    )
    payload = _gh_api_json(url, token=token)
    if not isinstance(payload, list):
        return 0
    return len(payload)


def decide_schedule_gate(
    *,
    force: bool = False,
    lookback_hours: int = DEFAULT_LOOKBACK_HOURS,
    merged_pr_count: int | None = None,
    workflow_touch_count: int | None = None,
    repo: str | None = None,
    token: str | None = None,
    now: datetime | None = None,
) -> ScheduleGateDecision:
    """Return whether a scheduled hygiene run should execute."""
    hours = max(1, int(lookback_hours))
    if force:
        return ScheduleGateDecision(
            should_run=True,
            reason="force",
            lookback_hours=hours,
            merged_pr_count=int(merged_pr_count or 0),
            workflow_touch_count=int(workflow_touch_count or 0),
        )

    stamp = now or datetime.now(UTC)
    since = stamp - timedelta(hours=hours)

    if merged_pr_count is None or workflow_touch_count is None:
        if not repo or not token:
            raise ValueError("repo and token are required unless counts are provided")
        if merged_pr_count is None:
            merged_pr_count = count_merged_prs_since(repo=repo, token=token, since=since)
        if workflow_touch_count is None:
            workflow_touch_count = count_workflow_commits_since(repo=repo, token=token, since=since)

    merged = int(merged_pr_count or 0)
    touches = int(workflow_touch_count or 0)
    if merged > 0 or touches > 0:
        return ScheduleGateDecision(
            should_run=True,
            reason="recent_main_changes",
            merged_pr_count=merged,
            workflow_touch_count=touches,
            lookback_hours=hours,
        )
    return ScheduleGateDecision(
        should_run=False,
        reason="no_recent_merges_or_workflow_changes",
        merged_pr_count=merged,
        workflow_touch_count=touches,
        lookback_hours=hours,
    )


__all__ = [
    "DEFAULT_LOOKBACK_HOURS",
    "DEFAULT_WORKFLOWS_DIR",
    "HygieneFinding",
    "HygieneReport",
    "ScheduleGateDecision",
    "count_merged_prs_since",
    "count_workflow_commits_since",
    "decide_schedule_gate",
    "extract_run_blocks",
    "iter_workflow_files",
    "scan_workflow_text",
    "scan_workflows",
]
