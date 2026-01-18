// SCARLETT • Avatar Packet v4.8
// index.js: light boot + XR support fingerprint

(() => {
  const BUILD = 'SCARLETT_AVATAR_PACKET_v4_8';
  console.log('[scarlett] boot ✅', BUILD);

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.BUILD = BUILD;

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const xr = !!navigator.xr;
      console.log('[scarlett] navigator.xr=', xr);
      if (xr && navigator.xr.isSessionSupported) {
        const ok = await navigator.xr.isSessionSupported('immersive-vr');
        console.log('[scarlett] immersive-vr supported=', ok);
      }
    } catch (e) {
      console.warn('[scarlett] XR preflight error', e);
    }
  });
})();
