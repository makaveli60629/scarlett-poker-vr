import { Core } from './core.js';

const startApp = async () => {
    if (window.ScarlettLoaded) return;
    console.log('[BOOT] Scarlett Spine Initializing...');
    try {
        await Core.start();
        window.ScarlettLoaded = true;
    } catch (e) {
        console.error('[BOOT ERROR]', e);
    }
};

window.addEventListener('DOMContentLoaded', startApp);
// Fallback for mobile browsers that require a gesture
setTimeout(() => {
    if (!window.ScarlettLoaded) {
        window.addEventListener('touchstart', startApp, { once: true });
    }
}, 2000);
