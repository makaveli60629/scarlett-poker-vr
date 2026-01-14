export const HUD = {
    init(ctx) {
        const h = document.getElementById('hud');
        
        // This listener allows you to toggle the diagnostic view
        window.addEventListener('dblclick', () => {
            h.classList.toggle('hidden');
            console.log('[HUD] Toggle visibility');
        });
    }
};
