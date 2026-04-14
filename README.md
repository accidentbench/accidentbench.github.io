# ACCIDENT

Repository and project website for **ACCIDENT: A Benchmark Dataset for Vehicle Accident Detection from Traffic Surveillance Videos**.

## Links

- Website: [https://accidentbench.github.io/](https://accidentbench.github.io/)
- Dataset: [Kaggle](https://www.kaggle.com/datasets/picekl/accident)
- Paper: [arXiv:2604.09819](https://arxiv.org/abs/2604.09819)
- Code and generation pipeline: [GitHub](https://github.com/accidentbench/ACCIDENT)

## What Is In This Repo

This repository currently contains:

- the public benchmark website
- benchmark-specific leaderboard pages
- browser-side CSV scoring for local score preview
- public leaderboard data files
- submission instructions and PR template
- GitHub Pages deployment workflow

The main research implementation and supplementary materials live separately from the public site structure.

## Website Structure

```text
.
├── assets/
│   ├── css/
│   ├── figures/
│   ├── js/
│   └── videos/
├── benchmarks/
│   ├── in-distribution/
│   ├── out-of-distribution/
│   └── zero-shot/
├── data/
│   ├── labels.csv
│   ├── labels.js
│   └── leaderboards/
├── submission/
├── scripts/
├── .github/
└── index.html
```

Key public pages:

- Homepage: [`index.html`](./index.html)
- In-distribution leaderboard: [`benchmarks/in-distribution/index.html`](./benchmarks/in-distribution/index.html)
- Out-of-distribution leaderboard: [`benchmarks/out-of-distribution/index.html`](./benchmarks/out-of-distribution/index.html)
- Zero-shot leaderboard: [`benchmarks/zero-shot/index.html`](./benchmarks/zero-shot/index.html)
- Submission guide: [`submission/index.html`](./submission/index.html)

## Benchmarks

ACCIDENT evaluates the same three tasks across three benchmark settings:

- `when`: temporal localization of the accident
- `where`: spatial localization of the accident
- `what`: collision type classification

Benchmark settings:

- `in-distribution`
- `ood`
- `zero-shot`

## Leaderboards And Scoring

Leaderboard data lives in:

- [`data/leaderboards/iid.json`](./data/leaderboards/iid.json)
- [`data/leaderboards/ood.json`](./data/leaderboards/ood.json)
- [`data/leaderboards/zero-shot.json`](./data/leaderboards/zero-shot.json)

Browser-side score preview is powered by:

- [`assets/js/submission-scoring.js`](./assets/js/submission-scoring.js)
- [`data/labels.js`](./data/labels.js)

Workflow and scoring utilities:

- scoring logic: [`scripts/metrics.py`](./scripts/metrics.py)
- leaderboard updater: [`scripts/update_leaderboard.py`](./scripts/update_leaderboard.py)
- PR scoring workflow: [`.github/workflows/score-submission-pr.yml`](./.github/workflows/score-submission-pr.yml)
- post-merge leaderboard workflow: [`.github/workflows/score-submissions.yml`](./.github/workflows/score-submissions.yml)

## Submission Flow

1. Score your CSV on the relevant leaderboard page.
2. Place the submission file under `submissions/<benchmark>/team-name.csv`.
3. Open a pull request and fill out [`.github/pull_request_template.md`](./.github/pull_request_template.md).
4. The PR workflow validates and scores the submission.
5. After merge, leaderboard data can be updated from the submission metadata and score.

Current benchmark folder names used by the submission flow:

- `iid`
- `ood`
- `zero-shot`

## Media And Assets

- Public website media lives under [`assets/videos`](./assets/videos) and [`assets/figures`](./assets/figures).
- Video files are tracked with Git LFS through [`.gitattributes`](./.gitattributes).
- The website intentionally uses a curated public subset rather than the full supplementary asset set.

## Development Notes

- GitHub Pages deploys the static site from this repository.
- GoatCounter is integrated for page-level analytics on the public site.
- Local score preview works best when the site is served over HTTP rather than opened directly with `file://`.
