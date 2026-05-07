document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".tab-button");
    const panels = document.querySelectorAll(".tab-panel");
    const dropdowns = document.querySelectorAll(".nav-dropdown");
    const assetFilterButtons = document.querySelectorAll(".asset-filter-button");
    let canLoadAssetVideos = false;

    const loadCardVideos = (card) => {
        card.querySelectorAll("video").forEach((video) => {
            let shouldLoad = false;
            video.querySelectorAll("source[data-src]").forEach((source) => {
                source.src = source.dataset.src;
                source.removeAttribute("data-src");
                shouldLoad = true;
            });

            if (shouldLoad) {
                video.load();
            }
        });
    };

    const shuffleCards = (cards) => {
        const result = cards.slice();
        for (let i = result.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    };

    const stopCardVideos = (card) => {
        card.querySelectorAll("video").forEach((video) => {
            video.pause();
            video.currentTime = 0;
        });
    };

    const applyAssetFilter = (filterGroup, filter) => {
        const cards = Array.from(document.querySelectorAll(`.asset-card-sample[data-filter-group="${filterGroup}"]`));
        const visibleCards = filter === "all" ? shuffleCards(cards) : cards;

        cards.forEach((card) => {
            card.dataset.hidden = "true";
        });

        let visibleCount = 0;
        visibleCards.forEach((card) => {
            const matches = filter === "all" || card.dataset.type === filter;
            const withinDefaultLimit = filter !== "all" || visibleCount < 8;
            const show = matches && withinDefaultLimit;

            card.dataset.hidden = show ? "false" : "true";

            if (!show) {
                stopCardVideos(card);
            }
            if (show) {
                if (canLoadAssetVideos) {
                    loadCardVideos(card);
                }
                card.dataset.hidden = "false";
                visibleCount += 1;
            }
        });
    };

    const loadDeferredAssetVideos = () => {
        const cards = Array.from(document.querySelectorAll(".asset-card-sample"));
        const visibleCards = cards.filter((card) => card.dataset.hidden !== "true");
        const hiddenCards = cards.filter((card) => card.dataset.hidden === "true");
        const loadHiddenCards = () => hiddenCards.forEach(loadCardVideos);

        canLoadAssetVideos = true;
        visibleCards.forEach(loadCardVideos);

        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(loadHiddenCards, { timeout: 3000 });
        } else {
            window.setTimeout(loadHiddenCards, 1200);
        }
    };

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const tab = button.dataset.tab;

            buttons.forEach((item) => item.classList.remove("active"));
            panels.forEach((panel) => panel.classList.remove("active"));

            button.classList.add("active");
            const panel = document.getElementById(`tab-${tab}`);
            if (panel) {
                panel.classList.add("active");
            }
        });
    });

    dropdowns.forEach((dropdown) => {
        const toggle = dropdown.querySelector(".nav-dropdown-toggle");
        if (!toggle) {
            return;
        }

        toggle.addEventListener("click", (event) => {
            event.preventDefault();
            const isOpen = dropdown.classList.toggle("open");
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    });

    document.addEventListener("click", (event) => {
        dropdowns.forEach((dropdown) => {
            if (!dropdown.contains(event.target)) {
                dropdown.classList.remove("open");
                const toggle = dropdown.querySelector(".nav-dropdown-toggle");
                if (toggle) {
                    toggle.setAttribute("aria-expanded", "false");
                }
            }
        });
    });

    assetFilterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const filterGroup = button.dataset.filterGroup;
            const filter = button.dataset.filter;
            const groupButtons = document.querySelectorAll(`.asset-filter-button[data-filter-group="${filterGroup}"]`);

            groupButtons.forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            applyAssetFilter(filterGroup, filter);
        });
    });

    ["real-world", "synthetic"].forEach((filterGroup) => {
        applyAssetFilter(filterGroup, "all");
    });

    window.addEventListener("load", loadDeferredAssetVideos, { once: true });
});
