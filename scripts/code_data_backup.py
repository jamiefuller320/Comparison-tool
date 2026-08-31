#!/usr/bin/env python3
"""Weekly code + data backup snapshots for School Compass.

Creates a gzip tarball of application code and harvested datasets, optionally
uploads to S3 using the same secret names as Value Investor
(``BACKUP_S3_URI``, ``AWS_ACCESS_KEY_ID``, ``AWS_SECRET_ACCESS_KEY``,
``AWS_DEFAULT_REGION``), and can restore / verify locally.

GitHub remains the primary store. Off-repo snapshots protect against
repo-wide incidents and make a restore drill faster than mining git history.

Usage:
  python3 scripts/code_data_backup.py snapshot --json
  python3 scripts/code_data_backup.py snapshot --upload --upload-monthly
  python3 scripts/code_data_backup.py deliver --from-json /tmp/backup.json --upload
  python3 scripts/code_data_backup.py verify output/backups/school-compass-….tar.gz
  python3 scripts/code_data_backup.py restore output/backups/school-compass-….tar.gz
  python3 scripts/code_data_backup.py drill
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import shutil
import subprocess
import sys
import tarfile
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_BACKUP_DIR = Path("output/backups")
ARCHIVE_PREFIX = "school-compass"
S3_PROJECT_SEGMENT = "school-compass"

# Application source and ops config — cheap to list, needed if GitHub is gone.
CODE_RELATIVE_PATHS: tuple[str, ...] = (
    "src",
    "scripts",
    "tools",
    ".github",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "tailwind.config.ts",
    "postcss.config.mjs",
    "requirements-data.txt",
    "README.md",
    "SOFT_LAUNCH.md",
    "DEFERRED_IDEAS.md",
    ".gitignore",
)

# Harvested / learned datasets — expensive or slow to regenerate.
DATA_RELATIVE_PATHS: tuple[str, ...] = (
    "public",
    "output",
)

# Never pack these even when they sit under a selected tree.
EXCLUDE_DIR_NAMES: frozenset[str] = frozenset(
    {
        ".git",
        ".next",
        "node_modules",
        "out",
        "__pycache__",
        "backups",
        "qualitative-partials",
        ".cache",
    }
)
EXCLUDE_SUFFIXES: tuple[str, ...] = (".pyc", ".egg-info")

REQUIRED_DRILL_PATHS: tuple[str, ...] = (
    "src",
    "scripts",
    "public/data",
)


@dataclass
class BackupManifest:
    created_at: str
    kind: str
    archive_name: str
    paths: list[str]
    file_count: int
    bytes: int
    sha256: str
    git_head: str | None = None
    git_bundle: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "created_at": self.created_at,
            "kind": self.kind,
            "archive_name": self.archive_name,
            "paths": self.paths,
            "file_count": self.file_count,
            "bytes": self.bytes,
            "sha256": self.sha256,
        }
        if self.git_head:
            payload["git_head"] = self.git_head
        if self.git_bundle:
            payload["git_bundle"] = self.git_bundle
        return payload

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BackupManifest:
        return cls(
            created_at=str(data["created_at"]),
            kind=str(data.get("kind") or "code+data"),
            archive_name=str(data["archive_name"]),
            paths=list(data.get("paths") or []),
            file_count=int(data.get("file_count") or 0),
            bytes=int(data.get("bytes") or 0),
            sha256=str(data.get("sha256") or ""),
            git_head=(str(data["git_head"]) if data.get("git_head") else None),
            git_bundle=(str(data["git_bundle"]) if data.get("git_bundle") else None),
        )


@dataclass
class BackupSnapshot:
    archive_path: Path
    manifest_path: Path
    manifest: BackupManifest

    def to_dict(self) -> dict[str, Any]:
        return {
            "archive_path": str(self.archive_path),
            "manifest_path": str(self.manifest_path),
            "manifest": self.manifest.to_dict(),
        }


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _archive_stamp(now: datetime | None = None) -> str:
    current = now or datetime.now(UTC)
    return current.strftime("%Y%m%dT%H%M%SZ")


def _existing_paths(repo_root: Path, relative_paths: Iterable[str]) -> list[Path]:
    found: list[Path] = []
    for rel in relative_paths:
        path = repo_root / rel
        if path.exists():
            found.append(path)
    return found


def _should_exclude(rel: str) -> bool:
    parts = Path(rel).parts
    if any(part in EXCLUDE_DIR_NAMES for part in parts):
        return True
    return any(rel.endswith(suffix) or f"{suffix}/" in rel for suffix in EXCLUDE_SUFFIXES)


def _iter_archive_members(source: Path, repo_root: Path) -> Iterable[tuple[Path, str]]:
    rel = source.relative_to(repo_root).as_posix()
    if _should_exclude(rel):
        return
    if source.is_file():
        yield source, rel
        return
    yield source, rel
    for path in source.rglob("*"):
        member = path.relative_to(repo_root).as_posix()
        if _should_exclude(member):
            continue
        yield path, member


def _git_head(repo_root: Path) -> str | None:
    git_dir = repo_root / ".git"
    if not git_dir.exists():
        return None
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo_root), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return (proc.stdout or "").strip() or None


def _write_git_bundle(repo_root: Path, dest: Path) -> Path | None:
    if not (repo_root / ".git").exists():
        return None
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            ["git", "-C", str(repo_root), "bundle", "create", str(dest), "--all"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        logger.warning("git bundle failed: %s", exc)
        return None
    return dest if dest.exists() else None


def create_backup_snapshot(
    *,
    repo_root: Path | None = None,
    backup_dir: Path = DEFAULT_BACKUP_DIR,
    include_git: bool = False,
    now: datetime | None = None,
) -> BackupSnapshot:
    """Create a gzip tarball of code + harvested data (and optional git bundle)."""
    repo_root = Path(repo_root or Path.cwd()).resolve()
    rel_paths = list(CODE_RELATIVE_PATHS) + list(DATA_RELATIVE_PATHS)
    sources = _existing_paths(repo_root, rel_paths)
    if not sources:
        raise FileNotFoundError("No code/data backup paths exist in the repository")

    stamp = _archive_stamp(now)
    backup_dir = Path(backup_dir)
    if not backup_dir.is_absolute():
        backup_dir = repo_root / backup_dir
    backup_dir.mkdir(parents=True, exist_ok=True)
    archive_path = backup_dir / f"{ARCHIVE_PREFIX}-{stamp}.tar.gz"
    manifest_path = backup_dir / f"{ARCHIVE_PREFIX}-{stamp}.manifest.json"

    bundle_rel = f"{ARCHIVE_PREFIX}.git.bundle"
    bundle_path: Path | None = None
    if include_git:
        bundle_path = _write_git_bundle(repo_root, backup_dir / bundle_rel)

    file_count = 0
    with tarfile.open(archive_path, "w:gz") as tar:
        for source in sources:
            for path, arcname in _iter_archive_members(source, repo_root):
                tar.add(path, arcname=arcname, recursive=False)
                if path.is_file():
                    file_count += 1
        if bundle_path is not None:
            tar.add(bundle_path, arcname=bundle_rel, recursive=False)
            file_count += 1

    digest = _sha256_file(archive_path)
    manifest = BackupManifest(
        created_at=(now or datetime.now(UTC)).isoformat(),
        kind="code+data+git" if bundle_path is not None else "code+data",
        archive_name=archive_path.name,
        paths=[path.relative_to(repo_root).as_posix() for path in sources],
        file_count=file_count,
        bytes=archive_path.stat().st_size,
        sha256=digest,
        git_head=_git_head(repo_root),
        git_bundle=bundle_rel if bundle_path is not None else None,
    )
    manifest_path.write_text(json.dumps(manifest.to_dict(), indent=2) + "\n", encoding="utf-8")
    if bundle_path is not None:
        try:
            bundle_path.unlink()
        except OSError:
            pass
    return BackupSnapshot(
        archive_path=archive_path, manifest_path=manifest_path, manifest=manifest
    )


def verify_backup_snapshot(
    archive_path: Path,
    *,
    manifest_path: Path | None = None,
) -> dict[str, Any]:
    archive_path = Path(archive_path)
    manifest_path = Path(
        manifest_path
        or archive_path.with_name(
            archive_path.name.replace(".tar.gz", ".manifest.json")
        )
    )
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found for {archive_path}")

    manifest = BackupManifest.from_dict(
        json.loads(manifest_path.read_text(encoding="utf-8"))
    )
    actual = _sha256_file(archive_path)
    ok = actual == manifest.sha256
    return {
        "ok": ok,
        "expected_sha256": manifest.sha256,
        "actual_sha256": actual,
        "manifest": manifest.to_dict(),
    }


def _is_within(root: Path, candidate: Path) -> bool:
    try:
        candidate.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def restore_backup_snapshot(
    archive_path: Path,
    *,
    repo_root: Path | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Extract a backup archive into the repository root (merge overwrite)."""
    repo_root = Path(repo_root or Path.cwd()).resolve()
    archive_path = Path(archive_path)
    if not archive_path.exists():
        raise FileNotFoundError(archive_path)

    restored: list[str] = []
    skipped: list[str] = []
    with tarfile.open(archive_path, "r:gz") as tar:
        for member in tar.getmembers():
            if member.issym() or member.islnk():
                skipped.append(member.name)
                continue
            if not member.isfile() and not member.isdir():
                skipped.append(member.name)
                continue
            if Path(member.name).is_absolute() or ".." in Path(member.name).parts:
                skipped.append(member.name)
                continue
            target = repo_root / member.name
            if not _is_within(repo_root, target):
                skipped.append(member.name)
                continue
            restored.append(member.name)
            if dry_run:
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            extracted = tar.extractfile(member)
            if extracted is None:
                continue
            target.write_bytes(extracted.read())

    return {
        "archive": str(archive_path),
        "dry_run": dry_run,
        "restored_paths": len(restored),
        "skipped_paths": len(skipped),
        "members": restored[:50],
    }


def list_local_snapshots(backup_dir: Path = DEFAULT_BACKUP_DIR) -> list[dict[str, Any]]:
    backup_dir = Path(backup_dir)
    if not backup_dir.exists():
        return []
    rows: list[dict[str, Any]] = []
    for manifest_path in sorted(
        backup_dir.glob(f"{ARCHIVE_PREFIX}-*.manifest.json"), reverse=True
    ):
        if "monthly" in manifest_path.name:
            continue
        try:
            manifest = BackupManifest.from_dict(
                json.loads(manifest_path.read_text(encoding="utf-8"))
            )
        except (OSError, ValueError, TypeError, KeyError):
            continue
        archive_path = backup_dir / manifest.archive_name
        rows.append(
            {
                "manifest_path": str(manifest_path),
                "archive_path": str(archive_path),
                "archive_exists": archive_path.exists(),
                "created_at": manifest.created_at,
                "bytes": manifest.bytes,
                "file_count": manifest.file_count,
            }
        )
    return rows


def _month_key_from_snapshot(snapshot: BackupSnapshot) -> str:
    raw = snapshot.manifest.created_at
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    created = datetime.fromisoformat(raw)
    if created.tzinfo is None:
        created = created.replace(tzinfo=UTC)
    return created.strftime("%Y-%m")


def backup_s3_prefix(s3_uri: str | None = None) -> str:
    """Destination prefix: existing BACKUP_S3_URI plus ``school-compass/``.

    If the configured URI already ends with ``school-compass``, it is used as-is
    so a dedicated prefix does not get doubled.
    """
    raw = (s3_uri if s3_uri is not None else os.environ.get("BACKUP_S3_URI") or "").strip()
    if not raw:
        return ""
    base = raw.rstrip("/")
    if base.endswith(f"/{S3_PROJECT_SEGMENT}") or base.endswith(S3_PROJECT_SEGMENT):
        return base
    return f"{base}/{S3_PROJECT_SEGMENT}"


def monthly_backup_dest_names(snapshot: BackupSnapshot) -> tuple[str, str]:
    month_key = _month_key_from_snapshot(snapshot)
    return (
        f"{ARCHIVE_PREFIX}-monthly-{month_key}.tar.gz",
        f"{ARCHIVE_PREFIX}-monthly-{month_key}.manifest.json",
    )


def _require_aws_cli() -> None:
    if not shutil.which("aws"):
        raise RuntimeError("aws CLI not found — install AWS CLI or upload the artifact manually")


def _s3_cp(local: Path, dest: str) -> None:
    subprocess.run(["aws", "s3", "cp", str(local), dest], check=True)


def upload_backup_snapshot(
    snapshot: BackupSnapshot,
    *,
    s3_uri: str | None = None,
) -> dict[str, Any]:
    """Upload archive + manifest to ``{BACKUP_S3_URI}/school-compass/``."""
    prefix = backup_s3_prefix(s3_uri)
    if not prefix:
        return {"uploaded": False, "reason": "BACKUP_S3_URI not configured"}
    _require_aws_cli()
    archive_dest = f"{prefix}/{snapshot.archive_path.name}"
    manifest_dest = f"{prefix}/{snapshot.manifest_path.name}"
    _s3_cp(snapshot.archive_path, archive_dest)
    _s3_cp(snapshot.manifest_path, manifest_dest)
    return {
        "uploaded": True,
        "archive_dest": archive_dest,
        "manifest_dest": manifest_dest,
    }


def upload_monthly_backup_pin(
    snapshot: BackupSnapshot,
    *,
    s3_uri: str | None = None,
) -> dict[str, Any]:
    """Overwrite a fixed monthly key under ``monthly/`` on S3."""
    prefix = backup_s3_prefix(s3_uri)
    if not prefix:
        return {"uploaded": False, "reason": "BACKUP_S3_URI not configured"}
    _require_aws_cli()
    archive_name, manifest_name = monthly_backup_dest_names(snapshot)
    monthly_base = f"{prefix}/monthly"
    archive_dest = f"{monthly_base}/{archive_name}"
    manifest_dest = f"{monthly_base}/{manifest_name}"
    _s3_cp(snapshot.archive_path, archive_dest)
    _s3_cp(snapshot.manifest_path, manifest_dest)
    return {
        "uploaded": True,
        "month_key": _month_key_from_snapshot(snapshot),
        "archive_dest": archive_dest,
        "manifest_dest": manifest_dest,
    }


def try_upload_backup_snapshot(
    snapshot: BackupSnapshot,
    *,
    s3_uri: str | None = None,
) -> dict[str, Any]:
    try:
        return upload_backup_snapshot(snapshot, s3_uri=s3_uri)
    except (RuntimeError, subprocess.CalledProcessError, OSError) as exc:
        logger.warning("Backup S3 upload failed: %s", exc)
        return {
            "uploaded": False,
            "error": str(exc),
            "error_type": type(exc).__name__,
        }


def try_upload_monthly_backup_pin(
    snapshot: BackupSnapshot,
    *,
    s3_uri: str | None = None,
) -> dict[str, Any]:
    try:
        return upload_monthly_backup_pin(snapshot, s3_uri=s3_uri)
    except (RuntimeError, subprocess.CalledProcessError, OSError) as exc:
        logger.warning("Monthly backup S3 pin failed: %s", exc)
        return {
            "uploaded": False,
            "error": str(exc),
            "error_type": type(exc).__name__,
        }


def snapshot_from_payload(data: dict[str, Any]) -> BackupSnapshot:
    manifest = BackupManifest.from_dict(data.get("manifest") or {})
    archive_path = Path(data.get("archive_path") or "")
    manifest_path = Path(data.get("manifest_path") or "")
    if not archive_path or not manifest_path:
        raise ValueError("payload missing archive_path or manifest_path")
    return BackupSnapshot(
        archive_path=archive_path,
        manifest_path=manifest_path,
        manifest=manifest,
    )


def run_restore_drill(*, repo_root: Path | None = None) -> dict[str, Any]:
    """Post-restore smoke: required code/data trees exist."""
    repo_root = Path(repo_root or Path.cwd())
    missing = [rel for rel in REQUIRED_DRILL_PATHS if not (repo_root / rel).exists()]
    extras: dict[str, bool] = {
        "schools_index": (repo_root / "public/data/schools-index.json").is_file(),
        "package_json": (repo_root / "package.json").is_file(),
        "git_bundle": (repo_root / f"{ARCHIVE_PREFIX}.git.bundle").is_file(),
    }
    return {
        "ok": not missing,
        "missing_paths": missing,
        "extras": extras,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Snapshot, verify, upload, and restore School Compass code + data backups",
    )
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--json", action="store_true")
    common.add_argument("--repo-root", type=Path, default=Path.cwd())
    common.add_argument("--backup-dir", type=Path, default=DEFAULT_BACKUP_DIR)
    sub = parser.add_subparsers(dest="command", required=True)

    snap = sub.add_parser("snapshot", parents=[common], help="Create tarball + manifest")
    snap.add_argument(
        "--include-git",
        action="store_true",
        help="Embed a git bundle (full refs) in the archive",
    )
    snap.add_argument("--upload", action="store_true", help="Upload when BACKUP_S3_URI is set")
    snap.add_argument(
        "--upload-monthly",
        action="store_true",
        help="Pin snapshot to monthly/ key on S3 (overwrite same calendar month)",
    )
    snap.add_argument(
        "--strict-upload",
        action="store_true",
        help="Exit non-zero when --upload is set but upload fails",
    )
    snap.set_defaults(func=_cmd_snapshot)

    deliver = sub.add_parser(
        "deliver",
        parents=[common],
        help="Upload an existing snapshot described by snapshot --json output",
    )
    deliver.add_argument("--from-json", type=Path, required=True)
    deliver.add_argument("--upload", action="store_true")
    deliver.add_argument("--upload-monthly", action="store_true")
    deliver.add_argument("--strict-upload", action="store_true")
    deliver.set_defaults(func=_cmd_deliver)

    sub.add_parser("list", parents=[common], help="List local snapshots").set_defaults(
        func=_cmd_list
    )

    verify = sub.add_parser("verify", parents=[common], help="Verify archive checksum")
    verify.add_argument("archive", type=Path)
    verify.add_argument("--manifest", type=Path, default=None)
    verify.set_defaults(func=_cmd_verify)

    restore = sub.add_parser("restore", parents=[common], help="Restore archive into repo root")
    restore.add_argument("archive", type=Path)
    restore.add_argument("--dry-run", action="store_true")
    restore.set_defaults(func=_cmd_restore)

    sub.add_parser("drill", parents=[common], help="Post-restore smoke checks").set_defaults(
        func=_cmd_drill
    )

    args = parser.parse_args(argv)
    return int(args.func(args))


def _upload_snapshot(snapshot: BackupSnapshot, *, strict: bool) -> tuple[dict[str, Any], int]:
    if strict:
        try:
            result = upload_backup_snapshot(snapshot)
        except (RuntimeError, subprocess.CalledProcessError, OSError) as exc:
            print(str(exc), file=sys.stderr)
            return {"uploaded": False, "error": str(exc)}, 1
    else:
        result = try_upload_backup_snapshot(snapshot)
    if strict and not result.get("uploaded") and result.get("error"):
        print(str(result.get("error")), file=sys.stderr)
        return result, 1
    return result, 0


def _upload_monthly_pin(snapshot: BackupSnapshot, *, strict: bool) -> tuple[dict[str, Any], int]:
    if strict:
        try:
            result = upload_monthly_backup_pin(snapshot)
        except (RuntimeError, subprocess.CalledProcessError, OSError) as exc:
            print(str(exc), file=sys.stderr)
            return {"uploaded": False, "error": str(exc)}, 1
    else:
        result = try_upload_monthly_backup_pin(snapshot)
    if strict and not result.get("uploaded") and result.get("error"):
        print(str(result.get("error")), file=sys.stderr)
        return result, 1
    return result, 0


def _cmd_snapshot(args: argparse.Namespace) -> int:
    snapshot = create_backup_snapshot(
        repo_root=args.repo_root,
        backup_dir=args.backup_dir,
        include_git=args.include_git,
    )
    upload_result = None
    monthly_result = None
    if args.upload:
        upload_result, code = _upload_snapshot(snapshot, strict=args.strict_upload)
        if code != 0:
            return code
    if args.upload_monthly:
        monthly_result, code = _upload_monthly_pin(snapshot, strict=args.strict_upload)
        if code != 0:
            return code
    payload = snapshot.to_dict()
    if upload_result is not None:
        payload["upload"] = upload_result
    if monthly_result is not None:
        payload["upload_monthly"] = monthly_result
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"Snapshot: {snapshot.archive_path}")
        print(f"  files: {snapshot.manifest.file_count}")
        print(f"  bytes: {snapshot.manifest.bytes}")
        print(f"  sha256: {snapshot.manifest.sha256}")
        if upload_result:
            print(f"  upload: {upload_result}")
        if monthly_result:
            print(f"  upload_monthly: {monthly_result}")
    return 0


def _cmd_deliver(args: argparse.Namespace) -> int:
    if not args.upload and not args.upload_monthly:
        print("deliver requires --upload and/or --upload-monthly", file=sys.stderr)
        return 2
    payload = json.loads(args.from_json.read_text(encoding="utf-8"))
    snapshot = snapshot_from_payload(payload)
    if args.upload:
        upload_result, code = _upload_snapshot(snapshot, strict=args.strict_upload)
        if code != 0:
            return code
        payload["upload"] = upload_result
    if args.upload_monthly:
        monthly_result, code = _upload_monthly_pin(snapshot, strict=args.strict_upload)
        if code != 0:
            return code
        payload["upload_monthly"] = monthly_result
    args.from_json.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    if args.json:
        print(json.dumps(payload, indent=2))
    return 0


def _cmd_list(args: argparse.Namespace) -> int:
    rows = list_local_snapshots(args.backup_dir)
    if args.json:
        print(json.dumps(rows, indent=2))
    elif not rows:
        print("No local snapshots")
    else:
        for row in rows:
            print(
                f"{row['created_at']}  {row['bytes']} bytes  "
                f"{'ok' if row['archive_exists'] else 'missing archive'}  {row['archive_path']}"
            )
    return 0


def _cmd_verify(args: argparse.Namespace) -> int:
    result = verify_backup_snapshot(args.archive, manifest_path=args.manifest)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Verify: {'ok' if result['ok'] else 'FAIL'}")
    return 0 if result["ok"] else 1


def _cmd_restore(args: argparse.Namespace) -> int:
    result = restore_backup_snapshot(
        args.archive,
        repo_root=args.repo_root,
        dry_run=args.dry_run,
    )
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        label = "Would restore" if args.dry_run else "Restored"
        print(f"{label} {result['restored_paths']} member(s) from {result['archive']}")
    return 0


def _cmd_drill(args: argparse.Namespace) -> int:
    result = run_restore_drill(repo_root=args.repo_root)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Drill ok={result['ok']}")
        if result["missing_paths"]:
            print(f"  missing: {', '.join(result['missing_paths'])}")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
