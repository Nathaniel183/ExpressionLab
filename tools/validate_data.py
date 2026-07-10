#!/usr/bin/env python3
"""Validate manifest, JSONL syntax, IDs and cross references."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
GROUPS = ("coverage", "examples", "exercises", "materials", "prompts")


def load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path.name} 第 {line_no} 行 JSON 无效：{exc}") from exc
        if not isinstance(value, dict):
            raise ValueError(f"{path.name} 第 {line_no} 行必须是 JSON 对象")
        rows.append(value)
    return rows


def main() -> int:
    manifest_path = DATA / "manifest.txt"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        loaded: dict[str, list[dict]] = {}
        for group in GROUPS:
            if not isinstance(manifest.get(group), list):
                raise ValueError(f"manifest.txt 中 {group} 必须是文件名数组")
            rows: list[dict] = []
            for filename in manifest[group]:
                path = DATA / filename
                if not path.exists():
                    raise FileNotFoundError(f"缺少文件：data/{filename}")
                rows.extend(load_jsonl(path))
            ids = [row.get("id") for row in rows]
            if any(not value for value in ids):
                raise ValueError(f"{group} 中存在缺失 id 的记录")
            duplicates = sorted({value for value in ids if ids.count(value) > 1})
            if duplicates:
                raise ValueError(f"{group} 中存在重复 id：{', '.join(duplicates)}")
            loaded[group] = rows
            print(f"✓ {group}: {len(rows)} 条")

        coverage_ids = {row["id"] for row in loaded["coverage"]}
        example_ids = {row["id"] for row in loaded["examples"]}
        for row in loaded["examples"]:
            missing = set(row.get("coverageIds", [])) - coverage_ids
            if missing:
                raise ValueError(f"范例 {row['id']} 引用了不存在的功能：{sorted(missing)}")
        for row in loaded["exercises"]:
            source = row.get("sourceExampleId", "")
            if source and source not in example_ids:
                raise ValueError(f"练习 {row['id']} 引用了不存在的范例：{source}")

        print("✓ 交叉引用有效")
        print("数据校验通过。")
        return 0
    except Exception as exc:  # concise CLI failure
        print(f"校验失败：{exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
