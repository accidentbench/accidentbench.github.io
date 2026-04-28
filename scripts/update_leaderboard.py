import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path


BUNDLE_PREFIX = "window.ACCIDENT_LEADERBOARDS = "


def slugify_submission_name(path: str) -> str:
    return Path(path).stem.replace("_", "-")


def load_bundle(path: Path) -> dict:
    if not path.exists():
        return {}

    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        return {}
    if raw.startswith(BUNDLE_PREFIX):
        raw = raw[len(BUNDLE_PREFIX):]
    if raw.endswith(";"):
        raw = raw[:-1]
    return json.loads(raw)


def write_bundle(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, indent=2)
    path.write_text(f"{BUNDLE_PREFIX}{serialized};\n", encoding="utf-8")


def leaderboard_sort_key(entry: dict) -> tuple[int, float]:
    score = entry.get("unified_score")
    if isinstance(score, (int, float)) and math.isfinite(score):
        return (0, -float(score))
    return (1, 0.0)


def main() -> None:
    parser = argparse.ArgumentParser(description="Update leaderboard bundle with a scored submission.")
    parser.add_argument("--scores", required=True, type=Path)
    parser.add_argument("--submission", required=True, type=Path)
    parser.add_argument("--benchmark", required=True, choices=["iid", "ood", "zero-shot"])
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--bundle", required=True, type=Path)
    args = parser.parse_args()

    scores = json.loads(args.scores.read_text(encoding="utf-8"))
    metadata = {}
    if args.metadata and args.metadata.exists():
        metadata = json.loads(args.metadata.read_text(encoding="utf-8"))
    bundle = load_bundle(args.bundle)
    leaderboard = bundle.get(
        args.benchmark,
        {
            "benchmark": args.benchmark,
            "updated_at": None,
            "entries": [],
        },
    )

    entry = {
        "submission_name": slugify_submission_name(args.submission.name),
        "source_file": str(args.submission),
        "scored_at": datetime.now(timezone.utc).isoformat(),
        "method_name": metadata.get("method_name"),
        "authors": metadata.get("authors"),
        "affiliation": metadata.get("affiliation"),
        "paper_url": metadata.get("paper_url"),
        "code_url": metadata.get("code_url"),
        "contact_email": metadata.get("contact_email"),
        "short_description": metadata.get("short_description"),
        "matched_rows": scores["matched_rows"],
        "submission_rows": scores["submission_rows"],
        "unified_score": scores["unified_score"],
        "type_accuracy": scores["type_accuracy"],
        "temporal": scores["temporal"],
        "spatial": scores["spatial"],
    }

    leaderboard["entries"] = [
        existing
        for existing in leaderboard.get("entries", [])
        if existing.get("source_file") != entry["source_file"]
    ]
    leaderboard["entries"].append(entry)
    leaderboard["entries"].sort(key=leaderboard_sort_key)
    leaderboard["updated_at"] = datetime.now(timezone.utc).isoformat()

    bundle[args.benchmark] = leaderboard
    write_bundle(args.bundle, bundle)


if __name__ == "__main__":
    main()
