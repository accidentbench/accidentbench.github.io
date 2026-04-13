document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".tab-button");
    const panels = document.querySelectorAll(".tab-panel");
    const dropdowns = document.querySelectorAll(".nav-dropdown");
    const assetFilterButtons = document.querySelectorAll(".asset-filter-button");
    const applyAssetFilter = (filterGroup, filter) => {
        const cards = Array.from(document.querySelectorAll(`.asset-card-sample[data-filter-group="${filterGroup}"]`));
        let visibleCount = 0;

        cards.forEach((card) => {
            const matches = filter === "all" || card.dataset.type === filter;
            const withinDefaultLimit = filter !== "all" || visibleCount < 8;
            const show = matches && withinDefaultLimit;

            card.dataset.hidden = show ? "false" : "true";

            if (show) {
                visibleCount += 1;
            }
        });
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
});
