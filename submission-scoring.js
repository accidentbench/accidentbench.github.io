document.addEventListener("DOMContentLoaded", () => {
    const SIGMA = 1.0;
    const COOLDOWN_SECONDS = 45;
    const taskRoot = document.querySelector(".submission-box");
    if (!taskRoot) {
        return;
    }

    const input = taskRoot.querySelector(".submission-input");
    const scoreButton = taskRoot.querySelector(".score-button");
    const status = taskRoot.querySelector(".submission-status");
    const results = taskRoot.querySelector(".score-results");
    const submitPrButton = taskRoot.querySelector(".submit-pr-button");
    const splitColumn = taskRoot.dataset.splitColumn;
    const splitValue = taskRoot.dataset.splitValue;
    const benchmarkName = taskRoot.dataset.benchmark || "default";
    const cooldownKey = `accident-score-cooldown-${benchmarkName}`;

    let labelsPromise;
    let selectedFile = null;

    function parseCsvLine(line) {
        const values = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            const next = line[i + 1];

            if (char === "\"") {
                if (inQuotes && next === "\"") {
                    current += "\"";
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === "," && !inQuotes) {
                values.push(current);
                current = "";
            } else {
                current += char;
            }
        }

        values.push(current);
        return values;
    }

    function parseCsv(text) {
        const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
        const lines = normalized.split("\n").filter(Boolean);
        if (!lines.length) {
            return [];
        }

        const header = parseCsvLine(lines[0]);
        const rows = [];
        for (let i = 1; i < lines.length; i += 1) {
            const values = parseCsvLine(lines[i]);
            const row = {};
            header.forEach((key, index) => {
                row[key] = values[index] ?? "";
            });
            rows.push(row);
        }
        return rows;
    }

    function toNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    function gaussianScore(delta, sigma) {
        return Math.exp(-(delta ** 2) / (2 * (sigma ** 2)));
    }

    async function loadLabels() {
        if (!labelsPromise) {
            labelsPromise = fetch("./labels.csv")
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Could not load labels.csv");
                    }
                    return response.text();
                })
                .then((text) => parseCsv(text))
                .then((rows) => {
                    if (!splitColumn || !splitValue) {
                        return rows;
                    }
                    return rows.filter((row) => row[splitColumn] === splitValue);
                });
        }
        return labelsPromise;
    }

    function scoreSubmission(labels, predictions) {
        const predictionsByPath = new Map();
        predictions.forEach((row) => {
            const path = row.path;
            if (!path) {
                return;
            }
            predictionsByPath.set(path, row);
        });

        const matched = labels
            .map((label) => {
                const prediction = predictionsByPath.get(label.path);
                if (!prediction) {
                    return null;
                }
                return { label, prediction };
            })
            .filter(Boolean);

        if (!matched.length) {
            throw new Error("No matching paths found between labels and the uploaded CSV.");
        }

        const sigmaX = matched.reduce((sum, item) => sum + (toNumber(item.label.x2) - toNumber(item.label.x1)), 0) / matched.length;
        const sigmaY = matched.reduce((sum, item) => sum + (toNumber(item.label.y2) - toNumber(item.label.y1)), 0) / matched.length;

        const temporal = matched.reduce((sum, item) => {
            const pred = toNumber(item.prediction.accident_time);
            const truth = toNumber(item.label.accident_time);
            return sum + gaussianScore(pred - truth, SIGMA);
        }, 0) / matched.length;

        const spatial = matched.reduce((sum, item) => {
            const predX = toNumber(item.prediction.center_x);
            const predY = toNumber(item.prediction.center_y);
            const truthX = toNumber(item.label.center_x);
            const truthY = toNumber(item.label.center_y);
            const xTerm = ((predX - truthX) ** 2) / (2 * ((sigmaX * SIGMA) ** 2));
            const yTerm = ((predY - truthY) ** 2) / (2 * ((sigmaY * SIGMA) ** 2));
            return sum + Math.exp(-(xTerm + yTerm));
        }, 0) / matched.length;

        const typeAccuracy = matched.reduce((sum, item) => {
            return sum + (String(item.prediction.type || "").trim().toLowerCase() === String(item.label.type || "").trim().toLowerCase() ? 1 : 0);
        }, 0) / matched.length;

        return {
            matchedRows: matched.length,
            totalPredictionRows: predictions.length,
            temporal,
            spatial,
            typeAccuracy,
            unified: (temporal + spatial + typeAccuracy) / 3,
        };
    }

    function renderScores(scores) {
        taskRoot.querySelector('[data-score="unified"]').textContent = scores.unified.toFixed(4);
        taskRoot.querySelector('[data-score="type"]').textContent = scores.typeAccuracy.toFixed(4);
        taskRoot.querySelector('[data-score="temporal"]').textContent = scores.temporal.toFixed(4);
        taskRoot.querySelector('[data-score="spatial"]').textContent = scores.spatial.toFixed(4);
        taskRoot.querySelector('[data-score="matched"]').textContent =
            `Matched ${scores.matchedRows} labeled clips out of ${scores.totalPredictionRows} submission rows.`;
        results.hidden = false;
        if (submitPrButton) {
            submitPrButton.hidden = false;
        }
    }

    function updateCooldownState() {
        const cooldownUntil = Number(localStorage.getItem(cooldownKey) || 0);
        const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
        if (remaining > 0) {
            scoreButton.disabled = true;
            scoreButton.textContent = `Score Again in ${remaining}s`;
            return true;
        }

        scoreButton.disabled = !selectedFile;
        scoreButton.textContent = "Score Submission";
        return false;
    }

    input.addEventListener("change", async (event) => {
        selectedFile = event.target.files?.[0] || null;
        if (!selectedFile) {
            return;
        }
        status.textContent = `Ready to score ${selectedFile.name}.`;
        results.hidden = true;
        if (submitPrButton) {
            submitPrButton.hidden = true;
        }
        updateCooldownState();
    });

    scoreButton.addEventListener("click", async () => {
        if (!selectedFile || updateCooldownState()) {
            return;
        }

        status.textContent = `Scoring ${selectedFile.name}...`;
        results.hidden = true;

        try {
            const [labels, text] = await Promise.all([
                loadLabels(),
                selectedFile.text(),
            ]);
            const predictions = parseCsv(text).map((row) => {
                if ("Unnamed: 0" in row) {
                    delete row["Unnamed: 0"];
                }
                return row;
            });

            const requiredColumns = ["path", "accident_time", "center_x", "center_y", "type"];
            const missingColumns = requiredColumns.filter((column) => !(column in (predictions[0] || {})));
            if (missingColumns.length) {
                throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
            }

            const scores = scoreSubmission(labels, predictions);
            status.textContent = `Scored ${selectedFile.name}.`;
            renderScores(scores);
            localStorage.setItem(cooldownKey, String(Date.now() + (COOLDOWN_SECONDS * 1000)));
            updateCooldownState();
        } catch (error) {
            status.textContent = error.message || "Could not score the uploaded file.";
            results.hidden = true;
        }
    });

    updateCooldownState();
    window.setInterval(updateCooldownState, 1000);
});
