#!/usr/bin/env python3
"""Tests for weekly code + data backup snapshots."""

from __future__ import annotations

import importlib.util
import io
import json
import os
import subprocess
import tarfile
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parent


def load_mod():
    path = SCRIPTS / "code_data_backup.py"
    spec = importlib.util.spec_from_file_location("code_data_backup", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _mini_repo(root: Path) -> Path:
    repo = root / "repo"
    (repo / "src" / "lib").mkdir(parents=True)
    (repo / "src" / "lib" / "phases.ts").write_text("export const X = 1;\n", encoding="utf-8")
    (repo / "scripts").mkdir()
    (repo / "scripts" / "harvest-schools.py").write_text("# harvest\n", encoding="utf-8")
    (repo / "public" / "data").mkdir(parents=True)
    (repo / "public" / "data" / "schools-index.json").write_text("{}", encoding="utf-8")
    (repo / "public" / "CNAME").write_text("schoolcompass.uk\n", encoding="utf-8")
    (repo / "output").mkdir()
    (repo / "output" / "learned-qa-patterns.json").write_text("{}", encoding="utf-8")
    (repo / "output" / "backups").mkdir()
    (repo / "output" / "backups" / "old.tar.gz").write_bytes(b"stale")
    (repo / "output" / "qualitative-partials").mkdir()
    (repo / "output" / "qualitative-partials" / "tmp.json").write_text("{}", encoding="utf-8")
    (repo / "src" / "__pycache__").mkdir()
    (repo / "src" / "__pycache__" / "x.pyc").write_bytes(b"\x00")
    (repo / "package.json").write_text('{"name":"school-compass"}\n', encoding="utf-8")
    (repo / "README.md").write_text("# School Compass\n", encoding="utf-8")
    return repo


def test_snapshot_verify_restore_roundtrip(tmp_path: Path) -> None:
    backup = load_mod()
    repo = _mini_repo(tmp_path)
    snapshot = backup.create_backup_snapshot(
        repo_root=repo,
        backup_dir=tmp_path / "backups",
        now=datetime(2026, 8, 31, 13, 0, tzinfo=UTC),
    )
    assert snapshot.archive_path.exists()
    assert snapshot.manifest.archive_name.startswith("school-compass-20260831T130000Z")
    assert snapshot.manifest.file_count >= 5
    assert "src" in snapshot.manifest.paths
    assert "public" in snapshot.manifest.paths
    assert "output" in snapshot.manifest.paths

    with tarfile.open(snapshot.archive_path, "r:gz") as tar:
        names = [member.name for member in tar.getmembers()]
    assert "src/lib/phases.ts" in names
    assert "public/data/schools-index.json" in names
    assert "output/learned-qa-patterns.json" in names
    assert "package.json" in names
    assert not any("backups/old.tar.gz" in name for name in names)
    assert not any("qualitative-partials" in name for name in names)
    assert not any("__pycache__" in name for name in names)

    verify = backup.verify_backup_snapshot(snapshot.archive_path)
    assert verify["ok"] is True

    target = tmp_path / "restore"
    target.mkdir()
    restored = backup.restore_backup_snapshot(snapshot.archive_path, repo_root=target)
    assert restored["restored_paths"] >= 5
    assert (target / "src/lib/phases.ts").read_text(encoding="utf-8") == "export const X = 1;\n"
    assert (target / "public/data/schools-index.json").exists()
    assert (target / "package.json").exists()
    assert not (target / "output/backups/old.tar.gz").exists()
    assert not (target / "src/__pycache__/x.pyc").exists()

    drill = backup.run_restore_drill(repo_root=target)
    assert drill["ok"] is True
    assert drill["extras"]["schools_index"] is True
    assert drill["extras"]["package_json"] is True


def test_restore_rejects_path_traversal(tmp_path: Path) -> None:
    backup = load_mod()
    archive = tmp_path / "evil.tar.gz"
    with tarfile.open(archive, "w:gz") as tar:
        info = tarfile.TarInfo(name="../escape.txt")
        payload = b"nope"
        info.size = len(payload)
        tar.addfile(info, fileobj=io.BytesIO(payload))
        safe = tarfile.TarInfo(name="src/ok.ts")
        safe_payload = b"ok"
        safe.size = len(safe_payload)
        tar.addfile(safe, fileobj=io.BytesIO(safe_payload))

    target = tmp_path / "restore"
    target.mkdir()
    result = backup.restore_backup_snapshot(archive, repo_root=target)
    assert result["skipped_paths"] >= 1
    assert not (tmp_path / "escape.txt").exists()
    assert (target / "src/ok.ts").read_text(encoding="utf-8") == "ok"


def test_s3_prefix_appends_school_compass() -> None:
    backup = load_mod()
    assert (
        backup.backup_s3_prefix("s3://bucket/ftse-value-investor/backups/")
        == "s3://bucket/ftse-value-investor/backups/school-compass"
    )
    assert backup.backup_s3_prefix("s3://bucket/school-compass") == "s3://bucket/school-compass"
    assert (
        backup.backup_s3_prefix("s3://bucket/backups/school-compass/")
        == "s3://bucket/backups/school-compass"
    )
    assert backup.backup_s3_prefix("") == ""


def test_monthly_dest_names_use_manifest_month(tmp_path: Path) -> None:
    backup = load_mod()
    repo = _mini_repo(tmp_path)
    snapshot = backup.create_backup_snapshot(
        repo_root=repo,
        backup_dir=tmp_path / "backups",
        now=datetime(2026, 8, 31, 13, 0, tzinfo=UTC),
    )
    archive_name, manifest_name = backup.monthly_backup_dest_names(snapshot)
    assert archive_name == "school-compass-monthly-2026-08.tar.gz"
    assert manifest_name == "school-compass-monthly-2026-08.manifest.json"


def test_try_upload_without_s3_uri_is_soft_skip(tmp_path: Path) -> None:
    backup = load_mod()
    repo = _mini_repo(tmp_path)
    snapshot = backup.create_backup_snapshot(repo_root=repo, backup_dir=tmp_path / "backups")
    result = backup.try_upload_backup_snapshot(snapshot, s3_uri="")
    assert result["uploaded"] is False
    assert result.get("reason") == "BACKUP_S3_URI not configured"
    monthly = backup.try_upload_monthly_backup_pin(snapshot, s3_uri="")
    assert monthly["uploaded"] is False
    assert monthly.get("reason") == "BACKUP_S3_URI not configured"


def test_upload_targets_school_compass_prefix(tmp_path: Path) -> None:
    backup = load_mod()
    repo = _mini_repo(tmp_path)
    snapshot = backup.create_backup_snapshot(
        repo_root=repo,
        backup_dir=tmp_path / "backups",
        now=datetime(2026, 8, 31, 13, 0, tzinfo=UTC),
    )
    calls: list[list[str]] = []

    with patch.object(backup.shutil, "which", lambda name: "/usr/bin/aws"):
        with patch.object(backup.subprocess, "run", lambda cmd, check=True: calls.append(cmd)):
            result = backup.upload_backup_snapshot(
                snapshot, s3_uri="s3://bucket/ftse-value-investor/backups/"
            )
            monthly = backup.upload_monthly_backup_pin(
                snapshot, s3_uri="s3://bucket/ftse-value-investor/backups/"
            )

    assert result["uploaded"] is True
    assert result["archive_dest"].startswith(
        "s3://bucket/ftse-value-investor/backups/school-compass/"
    )
    assert result["archive_dest"].endswith(snapshot.archive_path.name)
    assert monthly["uploaded"] is True
    assert monthly["month_key"] == "2026-08"
    assert monthly["archive_dest"] == (
        "s3://bucket/ftse-value-investor/backups/school-compass/monthly/"
        "school-compass-monthly-2026-08.tar.gz"
    )
    assert len(calls) == 4


def test_deliver_cli_updates_json_with_upload(tmp_path: Path) -> None:
    backup = load_mod()
    repo = _mini_repo(tmp_path)
    snapshot = backup.create_backup_snapshot(repo_root=repo, backup_dir=tmp_path / "backups")
    payload_path = tmp_path / "backup.json"
    payload_path.write_text(json.dumps(snapshot.to_dict()), encoding="utf-8")

    with patch.object(backup.shutil, "which", lambda name: "/usr/bin/aws"):
        with patch.object(backup.subprocess, "run", lambda cmd, check=True: None):
            with patch.dict(os.environ, {"BACKUP_S3_URI": "s3://bucket/prefix/"}):
                rc = backup.main(
                    [
                        "deliver",
                        "--from-json",
                        str(payload_path),
                        "--upload",
                        "--upload-monthly",
                        "--json",
                    ]
                )
    assert rc == 0
    saved = json.loads(payload_path.read_text(encoding="utf-8"))
    assert saved["upload"]["uploaded"] is True
    assert "school-compass" in saved["upload"]["archive_dest"]
    assert saved["upload_monthly"]["uploaded"] is True
    assert "monthly" in saved["upload_monthly"]["archive_dest"]


def test_snapshot_cli_json(tmp_path: Path) -> None:
    backup = load_mod()
    repo = _mini_repo(tmp_path)
    rc = backup.main(
        [
            "snapshot",
            "--json",
            "--repo-root",
            str(repo),
            "--backup-dir",
            str(tmp_path / "backups"),
        ]
    )
    assert rc == 0
    listed = backup.list_local_snapshots(tmp_path / "backups")
    assert listed
    assert listed[0]["archive_exists"] is True


def test_include_git_bundle(tmp_path: Path) -> None:
    backup = load_mod()
    repo = _mini_repo(tmp_path)
    subprocess.run(["git", "init"], cwd=repo, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=repo, check=True)
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=repo, check=True, capture_output=True)

    snapshot = backup.create_backup_snapshot(
        repo_root=repo,
        backup_dir=tmp_path / "backups",
        include_git=True,
    )
    assert snapshot.manifest.git_bundle == "school-compass.git.bundle"
    assert snapshot.manifest.git_head
    with tarfile.open(snapshot.archive_path, "r:gz") as tar:
        names = [member.name for member in tar.getmembers()]
    assert "school-compass.git.bundle" in names
    assert not (tmp_path / "backups" / "school-compass.git.bundle").exists()


def main() -> int:
    cases = (
        test_snapshot_verify_restore_roundtrip,
        test_restore_rejects_path_traversal,
        test_monthly_dest_names_use_manifest_month,
        test_try_upload_without_s3_uri_is_soft_skip,
        test_upload_targets_school_compass_prefix,
        test_deliver_cli_updates_json_with_upload,
        test_snapshot_cli_json,
        test_include_git_bundle,
    )
    test_s3_prefix_appends_school_compass()
    for case in cases:
        with tempfile.TemporaryDirectory() as tmp:
            case(Path(tmp))
    print("OK code-data-backup")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
