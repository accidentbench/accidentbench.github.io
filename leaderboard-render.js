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

    function formatScore(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number.toFixed(4) : "-";
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
        const response = await fetch(source);
        if (!response.ok) {
            throw new Error("Could not load leaderboard data.");
        }
        const leaderboard = await response.json();
        const entries = Array.isArray(leaderboard.entries) ? leaderboard.entries : [];

        if (!entries.length) {
            empty.hidden = false;
            return;
        }

        empty.hidden = true;
        body.innerHTML = entries.map((entry) => `
            <tr>
                <td>${methodCell(entry)}</td>
                <td>${paperCell(entry)}</td>
                <td>${formatScore(entry.temporal?.["1"])}</td>
                <td>${formatScore(entry.spatial?.["1"])}</td>
                <td>${formatScore(entry.type_accuracy)}</td>
                <td>${formatScore(entry.unified_score)}</td>
            </tr>
        `).join("");
    } catch (error) {
        empty.hidden = false;
        empty.textContent = error.message || "Could not load leaderboard data.";
    }
});
