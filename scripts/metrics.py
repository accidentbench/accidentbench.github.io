import argparse
import json
from pathlib import Path
from typing import Iterable
import pandas as pd
import numpy as np

LABELS_PATH = "data/labels.csv"
REQUIRED_COLUMNS = ["path", "accident_time", "center_x", "center_y", "type"]
DEFAULT_SIGMAS = [0.5, 1.0, 2.0]


def harmonic_mean(values: Iterable[float]) -> float:
    values = [float(value) for value in values]
    if any(value <= 0 for value in values):
        return 0.0
    return float(len(values) / sum(1.0 / value for value in values))

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


def score_submission(
    submission_csv: Path,
    labels_csv: Path,
    sigmas: list[float] | None = None,
) -> dict:
    sigmas = sigmas or DEFAULT_SIGMAS
    predictions = _load_submission(submission_csv)
    labels = _load_labels(labels_csv)

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
        temporal_scores[str(sigma)] = temporal_accuracy_metric(
            predictions=merged["accident_time_pred"],
            truth=merged["accident_time_true"],
            sigma=sigma,
        )

    normalized_sigma_x = np.array(labels["x2"] - labels["x1"]).mean()
    normalized_sigma_y = np.array(labels["y2"] - labels["y1"]).mean()
    spatial_scores = {}
    for sigma in sigmas:
        spatial_scores[str(sigma)] = spatial_accuracy_metric(
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
            temporal_scores["1.0"],
            spatial_scores["1.0"],
            type_score,
        ]
    )

    return {
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
    parser.add_argument("--output", type=Path, help="Optional path to write JSON scores.")
    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    scores = score_submission(
        submission_csv=args.submission,
        labels_csv=args.labels,
    )
    print(json.dumps(scores, indent=2))

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(scores, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
