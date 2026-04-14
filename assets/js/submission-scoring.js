document.addEventListener("DOMContentLoaded", () => {
    const SIGMA = 1.0;
    const COOLDOWN_SECONDS = 45;
    const taskRoot = document.querySelector(".submission-box");
    if (!taskRoot) {
        return;
    }

    const input = taskRoot.querySelector(".submission-input");
    const scoreButton = taskRoot.querySelector(".score-button");
    const scoreDialog = taskRoot.querySelector(".score-dialog");
    const scoreDialogClose = taskRoot.querySelector(".score-dialog-close");
    const dialogMessage = taskRoot.querySelector(".score-dialog-message");
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

    function harmonicMean(values) {
        if (values.some((value) => value <= 0)) {
            return 0;
        }
        return values.length / values.reduce((sum, value) => sum + (1 / value), 0);
    }

    async function loadLabels() {
        if (!labelsPromise) {
            labelsPromise = Promise.resolve()
                .then(() => {
                    if (Array.isArray(window.ACCIDENT_LABELS) && window.ACCIDENT_LABELS.length) {
                        return window.ACCIDENT_LABELS;
                    }
                    return fetch(taskRoot.dataset.labelsSrc || "../../data/labels.csv")
                        .then((response) => {
                            if (!response.ok) {
                                throw new Error("Could not load data/labels.csv");
                            }
                            return response.text();
                        })
                        .then((text) => parseCsv(text));
                })
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
            unified: harmonicMean([temporal, spatial, typeAccuracy]),
        };
    }

    function validateCoverage(labels, predictions) {
        const expectedPaths = new Set(labels.map((row) => row.path).filter(Boolean));
        const predictionRows = predictions.filter((row) => row.path);
        const predictionPaths = new Set(predictionRows.map((row) => row.path));

        const missingPaths = Array.from(expectedPaths).filter((path) => !predictionPaths.has(path));
        const extraPaths = Array.from(predictionPaths).filter((path) => !expectedPaths.has(path));

        if (missingPaths.length || extraPaths.length) {
            const issues = [];
            if (missingPaths.length) {
                issues.push(`missing ${missingPaths.length} required clip${missingPaths.length === 1 ? "" : "s"}`);
            }
            if (extraPaths.length) {
                issues.push(`contains ${extraPaths.length} row${extraPaths.length === 1 ? "" : "s"} outside the evaluated split`);
            }
            const sample = missingPaths.slice(0, 3);
            return {
                ok: false,
                message: `Submission not scored: it ${issues.join(" and ")}.${sample.length ? ` Example missing paths: ${sample.join(", ")}` : ""}`,
            };
        }

        return { ok: true };
    }

    function showDialogMessage(message) {
        if (!scoreDialog || !dialogMessage) {
            window.alert(message);
            return;
        }
        results.hidden = true;
        dialogMessage.textContent = message;
        dialogMessage.hidden = false;
        scoreDialog.showModal();
    }

    function clearDialogMessage() {
        if (!dialogMessage) {
            return;
        }
        dialogMessage.hidden = true;
        dialogMessage.textContent = "";
    }

    function renderScores(scores) {
        taskRoot.querySelector('[data-score="unified"]').textContent = scores.unified.toFixed(4);
        taskRoot.querySelector('[data-score="type"]').textContent = scores.typeAccuracy.toFixed(4);
        taskRoot.querySelector('[data-score="temporal"]').textContent = scores.temporal.toFixed(4);
        taskRoot.querySelector('[data-score="spatial"]').textContent = scores.spatial.toFixed(4);
        taskRoot.querySelector('[data-score="matched"]').textContent =
            `Matched ${scores.matchedRows} labeled clips out of ${scores.totalPredictionRows} submission rows.`;
        clearDialogMessage();
        results.hidden = false;
        if (submitPrButton) {
            submitPrButton.hidden = false;
        }
        if (scoreDialog) {
            scoreDialog.showModal();
        }
    }

    function resetResults() {
        if (scoreDialog?.open) {
            scoreDialog.close();
        }
        results.hidden = true;
        if (submitPrButton) {
            submitPrButton.hidden = true;
        }
    }

    if (scoreDialogClose && scoreDialog) {
        scoreDialogClose.addEventListener("click", () => {
            scoreDialog.close();
        });

        scoreDialog.addEventListener("click", (event) => {
            const bounds = scoreDialog.getBoundingClientRect();
            const withinDialog =
                event.clientX >= bounds.left &&
                event.clientX <= bounds.right &&
                event.clientY >= bounds.top &&
                event.clientY <= bounds.bottom;

            if (!withinDialog) {
                scoreDialog.close();
            }
        });
    }

    function updateCooldownState() {
        const cooldownUntil = Number(localStorage.getItem(cooldownKey) || 0);
        const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
        if (remaining > 0) {
            scoreButton.disabled = true;
            scoreButton.classList.remove("is-ready");
            scoreButton.textContent = `Score Again in ${remaining}s`;
            return true;
        }

        scoreButton.disabled = !selectedFile;
        scoreButton.classList.toggle("is-ready", Boolean(selectedFile));
        scoreButton.textContent = selectedFile ? "Score Submission" : "Select A CSV First";
        return false;
    }

    input.addEventListener("change", async (event) => {
        selectedFile = event.target.files?.[0] || null;
        if (!selectedFile) {
            clearDialogMessage();
            resetResults();
            updateCooldownState();
            return;
        }
        clearDialogMessage();
        resetResults();
        updateCooldownState();
    });

    scoreButton.addEventListener("click", async () => {
        if (!selectedFile || updateCooldownState()) {
            return;
        }

        resetResults();

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

            const validation = validateCoverage(labels, predictions);
            if (!validation.ok) {
                showDialogMessage(validation.message);
                return;
            }

            const scores = scoreSubmission(labels, predictions);
            renderScores(scores);
            localStorage.setItem(cooldownKey, String(Date.now() + (COOLDOWN_SECONDS * 1000)));
            updateCooldownState();
        } catch (error) {
            showDialogMessage(error.message || "Could not score the uploaded file.");
            resetResults();
        }
    });

    updateCooldownState();
    window.setInterval(updateCooldownState, 1000);
});
