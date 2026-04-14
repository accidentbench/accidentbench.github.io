document.addEventListener("DOMContentLoaded", async () => {
    const card = document.querySelector(".leaderboard-table-card");
    if (!card) {
        return;
    }

    const source = card.dataset.leaderboardSrc;
    const body = card.querySelector(".leaderboard-table-body");
    const empty = card.querySelector(".leaderboard-empty");
    if (!source || !body || !empty) {
        return;
    }

    function fallbackLeaderboard() {
        const key = source.split("/").pop()?.replace(".json", "");
        if (!key || !window.ACCIDENT_LEADERBOARDS) {
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

    try {
        let leaderboard = fallbackLeaderboard();
        if (!leaderboard) {
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error("Could not load leaderboard data.");
            }
            leaderboard = await response.json();
        }
        const entries = Array.isArray(leaderboard.entries) ? leaderboard.entries : [];

        if (!entries.length) {
            empty.hidden = false;
            return;
        }

        const rankedEntries = [...entries].sort((left, right) => {
            const leftScore = Number(left.unified_score);
            const rightScore = Number(right.unified_score);
            if (Number.isFinite(leftScore) && Number.isFinite(rightScore)) {
                return rightScore - leftScore;
            }
            if (Number.isFinite(leftScore)) {
                return -1;
            }
            if (Number.isFinite(rightScore)) {
                return 1;
            }
            return 0;
        });

        empty.hidden = true;
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
    } catch (error) {
        empty.hidden = false;
        empty.textContent = error.message || "Could not load leaderboard data.";
    }
});
