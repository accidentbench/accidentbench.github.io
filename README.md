# ACCIDENT

Project website and repository for **ACCIDENT: A Benchmark Dataset for Accident Detection from Traffic Surveillance Videos**.

This branch currently contains:

- the first draft of the public project webpage
- the GitHub Pages deployment workflow
- a lightweight publishing setup for the project website
- a small public subset of media assets

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

## Planned Additions

- dataset access instructions
- evaluation protocol details
- benchmark submission format
- official baselines
- training and inference code
- leaderboard updates
