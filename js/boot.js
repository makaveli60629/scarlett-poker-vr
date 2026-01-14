import { Core } from './core.js';

const startApp = async () => {
    if (window.ScarlettLoaded) return;
    try {
        await Core.start();
        window.ScarlettLoaded = true;
    } catch (e) {
        console.error('[BOOT ERROR]', e);
    }
};

// Start on load
window.addEventListener('DOMContentLoaded', startApp);

// Mobile Kickstart: If it's stuck on black, tap the screen
window.addEventListener('touchstart', startApp, { once: true });
window.addEventListener('mousedown', startApp, { once: true });
