#!/usr/bin/env python3
"""
List React components (src/components/**/*.tsx, *.jsx) sorted by last git modification.
Run from repo root. Uses: git log -1 --format="%ci" -- <path>
"""

import subprocess
import sys
from pathlib import Path
from typing import Optional


def get_repo_root() -> Path:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True,
        )
        return Path(out.stdout.strip())
    except (subprocess.CalledProcessError, FileNotFoundError):
        return Path(__file__).resolve().parent


def find_components(repo_root: Path) -> list[Path]:
    components_dir = repo_root / "src" / "components"
    if not components_dir.is_dir():
        return []
    files = []
    for ext in ("*.tsx", "*.jsx"):
        files.extend(components_dir.rglob(ext))
    return sorted(files)


def get_last_commit_date(repo_root: Path, file_path: Path) -> Optional[str]:
    """Return last commit date in ISO format (e.g. 2025-02-24 10:30:00 +0000) or None."""
    rel = file_path.relative_to(repo_root)
    # Git on Windows prefers forward slashes
    rel_str = rel.as_posix()
    try:
        out = subprocess.run(
            ["git", "log", "-1", '--format=%ci', "--", rel_str],
            capture_output=True,
            text=True,
            cwd=repo_root,
        )
        if out.returncode != 0 or not out.stdout.strip():
            return None
        return out.stdout.strip()
    except Exception:
        return None


def main() -> None:
    repo_root = get_repo_root()
    components = find_components(repo_root)
    if not components:
        print("No .tsx/.jsx files found under src/components", file=sys.stderr)
        sys.exit(1)

    # Collect (date_str, path) for sorting; put None dates last
    dated: list[tuple[Optional[str], Path]] = []
    for path in components:
        date_str = get_last_commit_date(repo_root, path)
        dated.append((date_str, path))

    # Sort by date descending (newest first); no git history last
    def sort_key(item: tuple[Optional[str], Path]) -> tuple[bool, str]:
        date_str, _ = item
        no_date = date_str is None  # (False, date) < (True, "") so reverse puts no_date last
        return (no_date, date_str or "")

    dated.sort(key=sort_key, reverse=True)

    rel_root = repo_root / "src" / "components"
    for date_str, path in dated:
        try:
            rel = path.relative_to(rel_root)
        except ValueError:
            rel = path
        name = rel.as_posix()
        date_display = date_str or "(no git history)"
        print(f"{date_display}  {name}")


if __name__ == "__main__":
    main()
