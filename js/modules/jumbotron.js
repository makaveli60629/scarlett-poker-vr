// SCARLETT • Jumbotron (TV look + auto-start attempt)

const DEFAULT_STREAM = {
  url: (window.SCARLETT_STREAM_URL || ''),
  fallbackMp4: './assets/demo.mp4'
};

export function spawnJumbotron(state) {
  const THREE = window.THREE;
  if (!THREE || !state?.scene) return;

  const group = new THREE.Group();
  group.name = 'jumbotron';
  group.position.set(-6, 2.2, -2);
  group.rotation.y = Math.PI * 0.35;
  state.scene.add(group);
  state.jumbotron = group;

  // Frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.0, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.9, metalness: 0.1 })
  );
  group.add(frame);

  // Screen
  const screenGeo = new THREE.PlaneGeometry(3.1, 1.74);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.0,
    emissive: new THREE.Color(0x0a0a0a),
    emissiveIntensity: 0.55,
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0, 0.085);
  group.add(screen);

  // Create HTML video element
  const vid = document.createElement('video');
  vid.playsInline = true;
  vid.crossOrigin = 'anonymous';
  vid.loop = true;
  vid.muted = true; // start muted to satisfy autoplay; we unmute on first user gesture
  vid.preload = 'auto';

  // Source selection: HLS if provided, else mp4 fallback
  const url = DEFAULT_STREAM.url;
  if (url && url.endsWith('.m3u8') && window.Hls) {
    const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
    hls.loadSource(url);
    hls.attachMedia(vid);
  } else {
    vid.src = DEFAULT_STREAM.fallbackMp4;
  }

  const vtex = new THREE.VideoTexture(vid);
  vtex.colorSpace = THREE.SRGBColorSpace || undefined;
  screenMat.map = vtex;
  screenMat.needsUpdate = true;

  // Auto start attempt
  const tryPlay = async () => {
    try {
      await vid.play();
    } catch (_) {
      // ignore; user gesture may be needed
    }
  };

  // Try at boot
  tryPlay();

  // Try again when XR session starts
  window.addEventListener('sessionstart', tryPlay);
  window.addEventListener('xrSessionStart', tryPlay);

  // First user gesture -> unmute
  const unlock = async () => {
    try {
      vid.muted = false;
      await tryPlay();
    } catch (_) {}
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });

  // TV darkening filter: overlay glass
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(3.12, 1.76),
    new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
      roughness: 0.2,
      metalness: 0.0,
      transmission: 0.0,
      clearcoat: 0.7,
      clearcoatRoughness: 0.15
    })
  );
  glass.position.set(0, 0, 0.09);
  group.add(glass);
}
