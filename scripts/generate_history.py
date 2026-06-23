from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
HISTORY_DIR = DATA_DIR / "history"
LIST_PATH = DATA_DIR / "_list.json"
TOTAL_LEVELS = 46
SCALE = 3


def round_score(value: float) -> float:
    return round(value, SCALE)


def score(rank: int, percent: int | float | str, min_percent: int | float | str) -> float:
    rank = int(rank)
    percent = float(percent)
    min_percent = float(min_percent)

    if rank > TOTAL_LEVELS:
        return 0.0

    # Bottom half requires 100%
    if rank > TOTAL_LEVELS / 2 and percent < 100:
        return 0.0

    normalized_rank = (rank - 1) / (TOTAL_LEVELS - 1)
    min_score = 3
    base_score = min_score + (200 - min_score) * (1 - math.pow(normalized_rank, 0.4))
    score_value = base_score * ((percent - (min_percent - 1)) / (100 - (min_percent - 1)))
    score_value = max(0, score_value)

    if percent != 100:
        return round_score(score_value - score_value / 3)

    return max(round_score(score_value), 0.0)


def iso_utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_name(value: str) -> str:
    return value.strip().lower()


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)
        file.write("\n")


def compute_leaderboard(levels: list[tuple[dict[str, Any], str | None]]) -> tuple[list[dict[str, Any]], list[str]]:
    score_map: dict[str, dict[str, list[dict[str, Any]]]] = {}
    errs: list[str] = []

    for (rank, (level, err)) in enumerate(levels, start=1):
        if err:
            errs.append(err)
            continue

        verifier = next(
            (user for user in score_map if normalize_name(user) == normalize_name(level["verifier"])),
            level["verifier"],
        )
        score_map.setdefault(verifier, {"verified": [], "completed": [], "progressed": []})

        score_map[verifier]["verified"].append(
            {
                "rank": rank,
                "level": level["name"],
                "score": score(rank, 100, level["percentToQualify"]),
                "link": level["verification"],
            }
        )

        for record in level.get("records", []):
            user = next(
                (entry for entry in score_map if normalize_name(entry) == normalize_name(record["user"])),
                record["user"],
            )
            score_map.setdefault(user, {"verified": [], "completed": [], "progressed": []})

            if record["percent"] == 100:
                score_map[user]["completed"].append(
                    {
                        "rank": rank,
                        "level": level["name"],
                        "score": score(rank, 100, level["percentToQualify"]),
                        "link": record["link"],
                    }
                )
            else:
                score_map[user]["progressed"].append(
                    {
                        "rank": rank,
                        "level": level["name"],
                        "percent": record["percent"],
                        "score": score(rank, record["percent"], level["percentToQualify"]),
                        "link": record["link"],
                    }
                )

    result = []
    for user, entries in score_map.items():
        verified = entries["verified"]
        completed = entries["completed"]
        progressed = entries["progressed"]
        total = sum(item["score"] for item in verified + completed + progressed)

        result.append(
            {
                "user": user,
                "total": round_score(total),
                "verified": verified,
                "completed": completed,
                "progressed": progressed,
            }
        )

    result.sort(key=lambda item: item["total"], reverse=True)
    return result, errs


def main() -> None:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)

    list_paths = load_json(LIST_PATH)
    levels: list[tuple[dict[str, Any], str | None]] = []

    for index, path in enumerate(list_paths):
        level_path = DATA_DIR / f"{path}.json"
        if not level_path.exists():
            levels.append((None, path))
            continue
        try:
            level = load_json(level_path)
            levels.append((level, None))
        except Exception:
            levels.append((None, path))

    leaderboard, errs = compute_leaderboard(levels)

    timestamp = iso_utc_now()
    date_folder = timestamp[:10]
    safe_timestamp = timestamp.replace(":", "-")
    snapshot_name = f"{safe_timestamp}.json"
    snapshot_path = HISTORY_DIR / date_folder / snapshot_name

    # Build list data in the same format fetchList() returns: [(level, err), ...]
    # Each entry is [level_dict, null] or [null, path_string]
    list_data = []

    for path in list_paths:
        level_path = DATA_DIR / f"{path}.json"

        if not level_path.exists():
            list_data.append([None, path])
            continue

        try:
            level = load_json(level_path)

            # Match fetchList()
            level["path"] = path
            level["records"] = sorted(
                level.get("records", []),
                key=lambda r: r["percent"],
                reverse=True,
            )

            list_data.append([level, None])

        except Exception:
            list_data.append([None, path])

    snapshot_payload = {
        "snapshotAt": timestamp,
        "leaderboard": leaderboard,
        "list": list_data,
        "errors": errs,
    }
    print("Writing snapshot to:", snapshot_path)
    print("Snapshot keys:", snapshot_payload.keys())
    print("List entries:", len(snapshot_payload["list"]))
    write_json(snapshot_path, snapshot_payload)
    saved = load_json(snapshot_path)
    print("Saved keys:", saved.keys())

    index_entries = []
    if (HISTORY_DIR / "index.json").exists():
        try:
            index_entries = load_json(HISTORY_DIR / "index.json")
        except Exception:
            index_entries = []

    index_entries.append(
        {
            "snapshotAt": timestamp,
            "path": f"{date_folder}/{snapshot_name}",
        }
    )

    # keep entries sorted by timestamp
    index_entries.sort(key=lambda item: item["snapshotAt"])
    write_json(HISTORY_DIR / "index.json", index_entries)

    print(f"Generated snapshot: {snapshot_path}")
    print(f"Saved {len(leaderboard)} leaderboard entries and {len(errs)} load errors.")


if __name__ == "__main__":
    main()
