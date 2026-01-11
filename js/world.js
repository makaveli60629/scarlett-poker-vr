// world.js — Scene + HLS Stream + VideoTexture + Spatial Audio + Channel API
export const scene = new THREE.Scene();

scene.background = new THREE.Color(0x05060a);

const video = document.getElementById("streamSource");
video.loop = true;              // safe for radio streams
video.muted = true;             // start muted until user enables audio
video.playsInline = true;

let hls = null;

export const CHANNELS = [
  { id: "ambient", name: "Ambient", url: "https://hls.somafm.com/hls/groovesalad/128k/program.m3u8" },
  { id: "chill",   name: "Chill",   url: "https://hls.somafm.com/hls/lush/128k/program.m3u8" }
];

export function initStream(url = CHANNELS[0].url) {
  // Tear down previous
  try {
    if (hls) { hls.destroy(); hls = null; }
  } catch(e) {}

  // HLS init
  if (window.Hls && Hls.isSupported()) {
    hls = new Hls({
      // Keep it conservative for Quest stability
      enableWorker: true,
      lowLatencyMode: false
    });
    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.ERROR, (evt, data) => {
      console.log("[hls] error", data?.type, data?.details, data);
    });

  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
  } else {
    console.log("[hls] not supported on this browser.");
  }
}

export function setStream(url) {
  initStream(url);

  // play() may fail until user gesture happens (expected)
  video.play().catch((e) => {
    console.log("[media] play blocked (needs user gesture)", e?.name, e?.message);
  });
}

export function enableAudio() {
  video.muted = false;
  // Must be called from user gesture on Quest
  return video.play();
}

// Basic lighting so it never looks black
const hemi = new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.7);
dir.position.set(4, 8, 3);
scene.add(dir);

// Simple lobby floor so there is always something to see
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

// --- Video screen ---
export const lobbyScreen = (() => {
  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.colorSpace = THREE.SRGBColorSpace;

  const screenGeo = new THREE.PlaneGeometry(16, 9);
  const screenMat = new THREE.MeshBasicMaterial({ map: videoTexture });

  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 2.6, -7);
  screen.rotation.y = 0;
  scene.add(screen);

  // Frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(16.3, 9.3, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x11162a, roughness: 0.5, metalness: 0.2 })
  );
  frame.position.copy(screen.position);
  frame.position.z -= 0.08;
  scene.add(frame);

  return screen;
})();

// Spatial audio: volume falls off with distance to screen
export function updateSpatialAudio(listenerPos) {
  const dist = listenerPos.distanceTo(lobbyScreen.position);
  const volume = Math.max(0, 1 - (dist / 15));
  video.volume = volume;
}

// Helper for palm-menu buttons
export function makeButtonPlane(w = 0.24, h = 0.10, color = 0x151525) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.isMenuButton = true;
  return mesh;
}
