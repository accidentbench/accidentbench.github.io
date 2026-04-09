document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".tab-button");
    const panels = document.querySelectorAll(".tab-panel");

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
});
