import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def slugify_submission_name(path: str) -> str:
    return Path(path).stem.replace("_", "-")


def main() -> None:
    parser = argparse.ArgumentParser(description="Update leaderboard JSON with a scored submission.")
    parser.add_argument("--scores", required=True, type=Path)
    parser.add_argument("--submission", required=True, type=Path)
    parser.add_argument("--benchmark", required=True, choices=["iid", "geo-aware", "zero-shot"])
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--leaderboard", required=True, type=Path)
    args = parser.parse_args()

    scores = json.loads(args.scores.read_text(encoding="utf-8"))
    metadata = {}
    if args.metadata and args.metadata.exists():
        metadata = json.loads(args.metadata.read_text(encoding="utf-8"))
    if args.leaderboard.exists():
        leaderboard = json.loads(args.leaderboard.read_text(encoding="utf-8"))
    else:
        leaderboard = {
            "benchmark": args.benchmark,
            "updated_at": None,
            "entries": [],
        }

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
    leaderboard["entries"].sort(key=lambda item: item["unified_score"], reverse=True)
    leaderboard["updated_at"] = datetime.now(timezone.utc).isoformat()

    args.leaderboard.parent.mkdir(parents=True, exist_ok=True)
    args.leaderboard.write_text(json.dumps(leaderboard, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
