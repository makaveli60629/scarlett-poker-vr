export const HUD = {
    init(ctx) {
        const h = document.getElementById('hud');
        // Double tap or double click to hide
        window.addEventListener('dblclick', () => h.classList.toggle('hidden'));
    }
};
