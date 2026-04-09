# ACCIDENT

Project website and repository for **ACCIDENT: A Benchmark Dataset for Vehicle Accident Detection from Traffic Surveillance Videos**.

This branch currently contains:

- the first draft of the public project webpage
- the GitHub Pages deployment workflow
- a lightweight publishing setup for the project website
- a small public subset of media assets
- a public submission-validation and leaderboard-scoring scaffold

The research code, paper PDF, and supplementary materials are being prepared separately and will be added later.

## Website

- Main project page: [`index.html`](./index.html)

The landing page is drafted to support a full project website with:

- paper links and citation
- benchmark overview
- multiple evaluation tracks
- draft leaderboard tables
- dataset and synthetic-data highlights
- links to supplementary visualizations

## Repository Layout

```text
.
├── assets/
│   ├── figures/
│   └── videos/
├── index.html
├── site.css
├── site.js
├── .github/
│   └── workflows/
└── .gitattributes
```

## Notes

- Benchmark and leaderboard values on the landing page are placeholders for the public website draft.
- Only a small publish-safe subset of media assets is included in this branch.
- Larger video files are tracked with Git LFS.
- The scoring workflows use [`labels.csv`](./labels.csv) from the repository directly.

## Submission Flow

- Put benchmark submissions under `submissions/<benchmark-name>/team-name.csv`
- Supported benchmark names in the scoring scaffold are `iid`, `geo-aware`, and `zero-shot`
- Submission PRs must fill out the standardized metadata block from [`.github/pull_request_template.md`](./.github/pull_request_template.md)
- Pull requests are scored automatically and receive a PR comment with the score preview
- After a submission is merged to `main`, the scoring workflow updates `leaderboards/<benchmark>.json` with score and PR metadata, then opens a PR with the leaderboard change

## Scoring Files

- Scoring logic: [`metrics.py`](./metrics.py)
- Leaderboard updater: [`scripts/update_leaderboard.py`](./scripts/update_leaderboard.py)
- PR scoring workflow: [`.github/workflows/score-submission-pr.yml`](./.github/workflows/score-submission-pr.yml)
- Post-merge leaderboard workflow: [`.github/workflows/score-submissions.yml`](./.github/workflows/score-submissions.yml)
- Leaderboard data:
  - [`leaderboards/iid.json`](./leaderboards/iid.json)
  - [`leaderboards/geo-aware.json`](./leaderboards/geo-aware.json)
  - [`leaderboards/zero-shot.json`](./leaderboards/zero-shot.json)

## Planned Additions

- dataset access instructions
- evaluation protocol details
- benchmark submission format
- official baselines
- training and inference code
- leaderboard updates
