import { THREE } from '../core/engine.js';
import { log, setHint } from '../core/diag.js';

// Jumbotron plays a video on a big screen. Default is a safe MP4.
// To use ABC News Live (or any HLS), set window.SCARLETT_STREAM_URL before boot, or edit DEFAULT_STREAM.
const DEFAULT_STREAM = {
  type: 'mp4',
  url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}

export function JumbotronModule() {
  return {
    name: 'jumbotron',
    init(engine) {
      const video = document.getElementById('abcVideo');
      const stream = window.SCARLETT_STREAM_URL || DEFAULT_STREAM.url;
      const isHls = /\.m3u8(\?|$)/i.test(stream);

      // Create screen mesh
      const s = engine.scene;
      const root = new THREE.Group();
      // Bring the screen closer so it's visible immediately in promo mode.
      root.position.set(0, 4.1, -20.5);
      root.rotation.y = 0;
      s.add(root);

      const tex = new THREE.VideoTexture(video);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(14.5, 8.2),
        new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveIntensity: 0.95, roughness: 0.4, metalness: 0.0 })
      );
      root.add(screen);

      // Dark backing to improve contrast
      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(15.0, 8.6),
        new THREE.MeshStandardMaterial({ color: 0x05070b, roughness: 1.0, metalness: 0.0 })
      );
      back.position.z = -0.02;
      root.add(back);

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(15.2, 8.8, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.8, metalness: 0.2 })
      );
      frame.position.z = -0.15;
      root.add(frame);

      // Start video after a user gesture
      let armed = false;
      const arm = () => {
        if (armed) return;
        armed = true;
        setHint('Jumbotron armed. Tap screen / press Enter VR to start video.');
      };
      window.addEventListener('pointerdown', arm, { once: true });
      document.getElementById('btnEnterVR')?.addEventListener('click', arm, { once: true });

      const start = async () => {
        try {
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');
          video.muted = true;
          video.loop = true;
          video.crossOrigin = 'anonymous';

          if (isHls) {
            // Use hls.js if needed
            if (!window.Hls) {
              await loadScript('https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js');
            }
            if (window.Hls?.isSupported()) {
              const hls = new window.Hls({
                enableWorker: true,
                lowLatencyMode: true,
              });
              hls.loadSource(stream);
              hls.attachMedia(video);
              hls.on(window.Hls.Events.MANIFEST_PARSED, async () => {
                await video.play();
              });
              log(`[jumbotron] HLS via hls.js: ${stream}`);
            } else {
              // Some browsers support native HLS
              video.src = stream;
              await video.play();
              log(`[jumbotron] native HLS: ${stream}`);
            }
          } else {
            video.src = stream;
            await video.play();
            log(`[jumbotron] MP4: ${stream}`);
          }
          setHint('Jumbotron playing ✅');
        } catch (e) {
          log('[jumbotron] video start failed: ' + (e?.message || e));
          setHint('Jumbotron: tap again to start (autoplay blocked).');
        }
      };

      // first gesture starts
      const startOnGesture = () => start();
      window.addEventListener('pointerdown', startOnGesture);

      // Expose helper
      window.SCARLETT = window.SCARLETT || {};
      window.SCARLETT.startJumbotron = start;
    }
  };
}
