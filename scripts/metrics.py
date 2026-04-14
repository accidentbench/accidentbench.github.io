import argparse
import json
from pathlib import Path
from typing import Iterable
import pandas as pd
import numpy as np

LABELS_PATH = "data/labels.csv"
REQUIRED_COLUMNS = ["path", "accident_time", "center_x", "center_y", "type"]
DEFAULT_SIGMAS = [0.5, 1.0, 2.0]
BENCHMARK_ALIASES = {
    "iid": "iid",
    "in-distribution": "iid",
    "in_distribution": "iid",
    "ood": "geo-aware",
    "out-of-distribution": "geo-aware",
    "out_of_distribution": "geo-aware",
    "geo-aware": "geo-aware",
    "geo_aware": "geo-aware",
    "zero-shot": "zero-shot",
    "zero_shot": "zero-shot",
    "zeroshot": "zero-shot",
}


def harmonic_mean(values: Iterable[float]) -> float:
    values = [float(value) for value in values]
    if any(value <= 0 for value in values):
        return 0.0
    return float(len(values) / sum(1.0 / value for value in values))


def sigma_key(value: float) -> str:
    number = float(value)
    if number.is_integer():
        return str(int(number))
    return str(number)

#################
# TEMPORAL TASK #
#################
def temporal_accuracy_metric(predictions: Iterable[int], truth: Iterable[int], sigma: float) -> float:
    predictions, truth = np.array(predictions), np.array(truth)
    sigmas = np.ones_like(predictions) * sigma
    scores = np.exp( -(predictions - truth)**2 / (2 * sigmas**2))
    return float(np.mean(scores))

def print_temporal_accuracy(predictions: pd.DataFrame, dataset_path: Path, sigmas: list[float] = [1/2, 1, 2]):
	true_df = pd.read_csv(dataset_path / LABELS_PATH)
	merged = true_df.merge(
			predictions,
			on="path",
			how="inner",
			suffixes=("_true", "_pred")
		)
      
	print("Temporal task:")
	print("____________________")
	print("| Sigma | Accuracy |")
	for sigma in sigmas:
		acc = temporal_accuracy_metric(
			predictions=merged["accident_time_pred"],
			truth=merged["accident_time_true"],
			sigma=sigma
		)
		
		print(f"| {sigma:.2f}  | {acc:.3f}    |")
	print("\n")

################
# SPATIAL TASK #
################

def spatial_accuracy_metric(predictions: Iterable[tuple[float, float]], truth: Iterable[tuple[float, float]], sigma: tuple[float, float]) -> float:
    predictions, truth = np.array(predictions), np.array(truth)
    sigmas = np.ones_like(predictions) * np.array(sigma)
    scores = np.exp(-(
        ((predictions[:, 0] - truth[:, 0])**2 / (2 * sigmas[:, 0]**2)) +
        ((predictions[:, 1] - truth[:, 1])**2 / (2 * sigmas[:, 1]**2))
    ))
    return float(np.mean(scores))


def print_spatial_accuracy(predictions: pd.DataFrame, dataset_path: Path, sigmas: list[float] = [1/2, 1, 2]):
	true_df = pd.read_csv(dataset_path / LABELS_PATH)
	merged = true_df.merge(
			predictions,
			on="path",
			how="inner",
			suffixes=("_true", "_pred")
		)
	normalized_sigma_x = np.array(true_df["x2"] - true_df["x1"]).mean()
	normalized_sigma_y = np.array(true_df["y2"] - true_df["y1"]).mean()
	
	print("Spatial task:")
	print("Normalized sigmas: ", normalized_sigma_x, normalized_sigma_y)
	print("____________________")
	print("| Sigma | Accuracy |")
	for sigma in sigmas:
		acc = spatial_accuracy_metric(
			predictions=list(zip(merged["center_x_pred"], merged["center_y_pred"])),
			truth=list(zip(merged["center_x_true"], merged["center_y_true"])),
			sigma=(normalized_sigma_x * sigma, normalized_sigma_y * sigma)
		)
		
		print(f"| {sigma:.2f}  | {acc:.3f}    |")
	print("\n")


###########################
# COLLISION TYPE ACCURACY #
###########################

def type_accuracy_metric(predictions: Iterable[str], truth: Iterable[str]) -> float:
    predictions = pd.Series(predictions).astype(str).str.strip().str.lower()
    truth = pd.Series(truth).astype(str).str.strip().str.lower()
    return float((predictions == truth).mean())


def normalize_benchmark_name(value: str) -> str:
    normalized = value.strip().lower()
    if normalized not in BENCHMARK_ALIASES:
        raise ValueError(f"Unsupported benchmark '{value}'. Expected one of: iid, in-distribution, ood, out-of-distribution, geo-aware, zero-shot.")
    return BENCHMARK_ALIASES[normalized]


def _validate_submission_frame(predictions: pd.DataFrame) -> None:
    missing = [column for column in REQUIRED_COLUMNS if column not in predictions.columns]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")


def _load_labels(labels_csv: Path) -> pd.DataFrame:
    labels = pd.read_csv(labels_csv)
    _validate_submission_frame(labels)
    return labels


def _load_submission(submission_csv: Path) -> pd.DataFrame:
    predictions = pd.read_csv(submission_csv)
    if "Unnamed: 0" in predictions.columns:
        predictions = predictions.drop(columns=["Unnamed: 0"])
    _validate_submission_frame(predictions)
    return predictions


def _filter_labels_for_benchmark(labels: pd.DataFrame, benchmark: str) -> pd.DataFrame:
    benchmark = normalize_benchmark_name(benchmark)
    if benchmark == "iid":
        return labels[labels["split_in_distribution"] == "test"].copy()
    if benchmark == "geo-aware":
        return labels[labels["split_geo_aware"] == "test"].copy()
    return labels.copy()


def _validate_coverage(labels: pd.DataFrame, predictions: pd.DataFrame) -> None:
    expected_paths = set(labels["path"].dropna().astype(str))
    prediction_rows = predictions[predictions["path"].notna()].copy()
    prediction_paths = set(prediction_rows["path"].astype(str))

    missing_paths = sorted(expected_paths - prediction_paths)
    extra_paths = sorted(prediction_paths - expected_paths)
    duplicate_paths = prediction_rows["path"].astype(str)
    duplicate_paths = duplicate_paths[duplicate_paths.duplicated()].unique().tolist()

    issues = []
    if missing_paths:
        issues.append(
            f"missing {len(missing_paths)} required clip{'s' if len(missing_paths) != 1 else ''}"
        )
    if extra_paths:
        issues.append(
            f"contains {len(extra_paths)} row{'s' if len(extra_paths) != 1 else ''} outside the evaluated split"
        )
    if duplicate_paths:
        issues.append(
            f"contains {len(duplicate_paths)} duplicate path{'s' if len(duplicate_paths) != 1 else ''}"
        )

    if issues:
        examples = []
        if missing_paths:
            examples.append(f"missing examples: {', '.join(missing_paths[:3])}")
        if extra_paths:
            examples.append(f"extra examples: {', '.join(extra_paths[:3])}")
        if duplicate_paths:
            examples.append(f"duplicate examples: {', '.join(duplicate_paths[:3])}")
        details = f" ({'; '.join(examples)})" if examples else ""
        raise ValueError(f"Submission not scored: it {' and '.join(issues)}{details}.")


def score_submission(
    submission_csv: Path,
    labels_csv: Path,
    benchmark: str,
    sigmas: list[float] | None = None,
) -> dict:
    sigmas = sigmas or DEFAULT_SIGMAS
    predictions = _load_submission(submission_csv)
    labels = _filter_labels_for_benchmark(_load_labels(labels_csv), benchmark)
    _validate_coverage(labels, predictions)

    merged = labels.merge(
        predictions,
        on="path",
        how="inner",
        suffixes=("_true", "_pred"),
    )
    if merged.empty:
        raise ValueError("Submission has no matching paths in data/labels.csv")

    temporal_scores = {}
    for sigma in sigmas:
        temporal_scores[sigma_key(sigma)] = temporal_accuracy_metric(
            predictions=merged["accident_time_pred"],
            truth=merged["accident_time_true"],
            sigma=sigma,
        )

    normalized_sigma_x = np.array(labels["x2"] - labels["x1"]).mean()
    normalized_sigma_y = np.array(labels["y2"] - labels["y1"]).mean()
    spatial_scores = {}
    for sigma in sigmas:
        spatial_scores[sigma_key(sigma)] = spatial_accuracy_metric(
            predictions=list(zip(merged["center_x_pred"], merged["center_y_pred"])),
            truth=list(zip(merged["center_x_true"], merged["center_y_true"])),
            sigma=(normalized_sigma_x * sigma, normalized_sigma_y * sigma),
        )

    type_score = type_accuracy_metric(
        predictions=merged["type_pred"],
        truth=merged["type_true"],
    )

    unified_score = harmonic_mean(
        [
            temporal_scores["1"],
            spatial_scores["1"],
            type_score,
        ]
    )

    return {
        "benchmark": normalize_benchmark_name(benchmark),
        "submission_rows": int(len(predictions)),
        "matched_rows": int(len(merged)),
        "temporal": temporal_scores,
        "spatial": spatial_scores,
        "type_accuracy": type_score,
        "unified_score": unified_score,
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Score an ACCIDENT benchmark submission.")
    parser.add_argument("--submission", required=True, type=Path, help="Path to the submission CSV.")
    parser.add_argument("--labels", required=True, type=Path, help="Path to the private labels CSV.")
    parser.add_argument("--benchmark", required=True, type=str, help="Benchmark name or alias.")
    parser.add_argument("--output", type=Path, help="Optional path to write JSON scores.")
    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    scores = score_submission(
        submission_csv=args.submission,
        labels_csv=args.labels,
        benchmark=args.benchmark,
    )
    print(json.dumps(scores, indent=2))

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(scores, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
