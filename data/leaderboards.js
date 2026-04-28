window.ACCIDENT_LEADERBOARDS = {
  "iid": {
    "benchmark": "iid",
    "updated_at": null,
    "entries": []
  },
  "ood": {
    "benchmark": "ood",
    "updated_at": null,
    "entries": []
  },
  "zero-shot": {
    "benchmark": "zero-shot",
    "updated_at": "2026-04-28T22:09:59.093786+00:00",
    "entries": [
      {
        "submission_name": "cynapfleet",
        "source_file": "submissions/zero-shot/cynapfleet.csv",
        "scored_at": "2026-04-28T22:09:59.093763+00:00",
        "method_name": "Two-Pass Hybrid YOLO11x + Qwen3-VL Coarse-to-Fine CCTV Accident Detector",
        "authors": "Dipit Saha, Shah Mohammad Abdul Mannan, Mohammad Raihan Rashid, Ruwad Naswan, Ahnaf Tahmid",
        "affiliation": "CSE, Bangladesh University of Engineering and Technology (BUET)",
        "paper_url": "N/A",
        "code_url": "N/A",
        "contact_email": "mahdithe8@gmail.com",
        "short_description": "Zero-shot CCTV accident detection pipeline using Qwen3-VL with a hierarchical two-pass coarse-to-fine design. Coarse pass uniformly samples 60 frames at 4 fps with embedded second-level timestamps, prompting the VLM to produce an initial accident time and collision-type hint. Fine pass deploys YOLO11x + BoT-SORT tracking at native FPS within a \u00b12 s refinement window, subsampling 24 key frames; each frame is annotated with per-vehicle bounding boxes overlaid visually and injected as normalized coordinate text, while the coarse type serves as a soft prior. Final accident time, spatial center, and collision type are extracted from the fine-pass VLM response.",
        "matched_rows": 2027,
        "submission_rows": 2027,
        "unified_score": 0.5041960940058913,
        "type_accuracy": 0.5027133695115935,
        "temporal": {
          "0.5": 0.41830641728861473,
          "1": 0.548569681719332,
          "2": 0.67048575512696
        },
        "spatial": {
          "0.5": 0.2389530789669217,
          "1": 0.4677403342188529,
          "2": 0.7210201168354406
        }
      },
      {
        "submission_name": "paper-best-from-all",
        "source_file": "paper/table-5-zero-shot-end-to-end",
        "scored_at": "2026-04-13T00:00:00Z",
        "method_name": "Best from all",
        "entry_kind": "baseline",
        "authors": "Picek et al.",
        "affiliation": "ACCIDENT paper baseline",
        "paper_url": "https://arxiv.org/abs/2604.09819",
        "code_url": "https://github.com/accidentbench/ACCIDENT",
        "short_description": "Paper baseline from Table 5 (end-to-end, modular upper bound).",
        "matched_rows": 1520,
        "submission_rows": 1520,
        "unified_score": 0.412,
        "type_accuracy": 0.433,
        "temporal": {
          "1": 0.343
        },
        "spatial": {
          "1": 0.488
        }
      },
      {
        "submission_name": "paper-molmo-7b",
        "source_file": "paper/table-5-zero-shot-end-to-end",
        "scored_at": "2026-04-13T00:00:00Z",
        "method_name": "Molmo-7B",
        "entry_kind": "baseline",
        "authors": "Picek et al.",
        "affiliation": "ACCIDENT paper baseline",
        "paper_url": "https://arxiv.org/abs/2604.09819",
        "code_url": "https://github.com/accidentbench/ACCIDENT",
        "short_description": "Paper baseline from Table 5 (end-to-end).",
        "matched_rows": 1520,
        "submission_rows": 1520,
        "unified_score": 0.358,
        "type_accuracy": 0.293,
        "temporal": {
          "1": 0.343
        },
        "spatial": {
          "1": 0.488
        }
      },
      {
        "submission_name": "paper-naive-baseline",
        "source_file": "paper/table-5-zero-shot-end-to-end",
        "scored_at": "2026-04-13T00:00:00Z",
        "method_name": "Naive Baseline",
        "entry_kind": "baseline",
        "authors": "Picek et al.",
        "affiliation": "ACCIDENT paper baseline",
        "paper_url": "https://arxiv.org/abs/2604.09819",
        "code_url": "https://github.com/accidentbench/ACCIDENT",
        "short_description": "Paper baseline from Table 5 (end-to-end).",
        "matched_rows": 1520,
        "submission_rows": 1520,
        "unified_score": 0.245,
        "type_accuracy": 0.335,
        "temporal": {
          "1": 0.19
        },
        "spatial": {
          "1": 0.25
        }
      },
      {
        "submission_name": "paper-heuristics",
        "source_file": "paper/table-5-zero-shot-end-to-end",
        "scored_at": "2026-04-13T00:00:00Z",
        "method_name": "Heuristics",
        "entry_kind": "baseline",
        "authors": "Picek et al.",
        "affiliation": "ACCIDENT paper baseline",
        "paper_url": "https://arxiv.org/abs/2604.09819",
        "code_url": "https://github.com/accidentbench/ACCIDENT",
        "short_description": "Paper baseline from Table 5 (end-to-end, no collision classification).",
        "matched_rows": 1520,
        "submission_rows": 1520,
        "unified_score": null,
        "type_accuracy": null,
        "temporal": {
          "1": 0.287
        },
        "spatial": {
          "1": 0.273
        }
      }
    ]
  }
};
