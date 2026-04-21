document.addEventListener("DOMContentLoaded", async () => {
    const card = document.querySelector(".leaderboard-table-card");
    if (!card) {
        return;
    }

    const key = card.dataset.leaderboardKey;
    const body = card.querySelector(".leaderboard-table-body");
    const empty = card.querySelector(".leaderboard-empty");
    const table = card.querySelector("table");
    const sortButtons = card.querySelectorAll("[data-sort-key]");
    if (!key || !body || !empty) {
        return;
    }

    let sortKey = "unified";
    let sortDirection = "desc";

    function getLeaderboard() {
        if (!window.ACCIDENT_LEADERBOARDS) {
            return null;
        }
        return window.ACCIDENT_LEADERBOARDS[key] || null;
    }

    function formatScore(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number.toFixed(4) : "-";
    }

    function formatDate(value) {
        if (!value) {
            return "-";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function scoreForKey(entry, key) {
        if (key === "rank" || key === "unified") {
            return Number(entry.unified_score);
        }
        if (key === "temporal") {
            return Number(entry.temporal?.["1"]);
        }
        if (key === "spatial") {
            return Number(entry.spatial?.["1"]);
        }
        if (key === "type") {
            return Number(entry.type_accuracy);
        }
        if (key === "updated") {
            const timestamp = new Date(entry.updated_at || 0).getTime();
            return Number.isFinite(timestamp) ? timestamp : 0;
        }
        return Number.NaN;
    }

    function paperCell(entry) {
        const parts = [];
        if (entry.paper_url && entry.paper_url !== "N/A") {
            parts.push(`<a href="${entry.paper_url}" target="_blank" rel="noreferrer">paper</a>`);
        }
        if (entry.code_url && entry.code_url !== "N/A") {
            parts.push(`<a href="${entry.code_url}" target="_blank" rel="noreferrer">code</a>`);
        }
        return parts.length ? parts.join(" / ") : "-";
    }

    function methodCell(entry) {
        const method = entry.method_name || entry.submission_name || "Unnamed submission";
        const lines = [`<strong>${method}</strong>`];
        if (entry.entry_kind === "baseline") {
            lines.push('<span class="leaderboard-chip">Baseline</span>');
        }
        const meta = [entry.authors, entry.affiliation].filter(Boolean).join(" | ");
        if (meta) {
            lines.push(`<span class="leaderboard-meta">${meta}</span>`);
        }
        if (entry.short_description) {
            lines.push(`<span class="leaderboard-meta">${entry.short_description}</span>`);
        }
        return lines.join("");
    }

    function compareEntries(left, right) {
        const leftScore = scoreForKey(left, sortKey);
        const rightScore = scoreForKey(right, sortKey);
        const multiplier = sortDirection === "asc" ? 1 : -1;

        if (Number.isFinite(leftScore) && Number.isFinite(rightScore) && leftScore !== rightScore) {
            return (leftScore - rightScore) * multiplier;
        }
        if (Number.isFinite(leftScore)) {
            return -1;
        }
        if (Number.isFinite(rightScore)) {
            return 1;
        }

        const leftName = (left.method_name || left.submission_name || "").toLowerCase();
        const rightName = (right.method_name || right.submission_name || "").toLowerCase();
        return leftName.localeCompare(rightName);
    }

    function updateSortButtons() {
        sortButtons.forEach((button) => {
            const isActive = button.dataset.sortKey === sortKey;
            button.dataset.active = isActive ? "true" : "false";
            button.dataset.direction = isActive ? sortDirection : "";
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    function renderRows(entries, leaderboard) {
        const rankedEntries = [...entries].sort(compareEntries);

        body.innerHTML = rankedEntries.map((entry, index) => `
            <tr${entry.entry_kind === "baseline" ? ' class="leaderboard-row-baseline"' : ""}>
                <td><strong>${index + 1}</strong></td>
                <td>${methodCell(entry)}</td>
                <td>${paperCell(entry)}</td>
                <td>${formatScore(entry.temporal?.["1"])}</td>
                <td>${formatScore(entry.spatial?.["1"])}</td>
                <td>${formatScore(entry.type_accuracy)}</td>
                <td>${formatScore(entry.unified_score)}</td>
                <td>${formatDate(entry.updated_at || leaderboard.updated_at)}</td>
            </tr>
        `).join("");
    }

    try {
        const leaderboard = getLeaderboard();
        if (!leaderboard) {
            throw new Error("Could not load leaderboard data.");
        }

        const entries = Array.isArray(leaderboard.entries) ? leaderboard.entries : [];

        if (!entries.length) {
            empty.hidden = false;
            return;
        }

        empty.hidden = true;
        updateSortButtons();
        renderRows(entries, leaderboard);

        sortButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const nextKey = button.dataset.sortKey;
                if (!nextKey) {
                    return;
                }
                if (sortKey === nextKey) {
                    sortDirection = sortDirection === "desc" ? "asc" : "desc";
                } else {
                    sortKey = nextKey;
                    sortDirection = "desc";
                }
                updateSortButtons();
                renderRows(entries, leaderboard);
                table?.focus();
            });
        });
    } catch (error) {
        empty.hidden = false;
        empty.textContent = error.message || "Could not load leaderboard data.";
    }
});
