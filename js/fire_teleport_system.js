// /js/fire_teleport_system.js — Scarlett Fire Teleport System v4.3 (Zero-Asset, Three.js/WebXR)
// Inspired by your A-Frame Update 4.3 manifest, implemented natively for Scarlett Hybrid.
//
// Features:
// ✅ Procedural lava-etched texture (CanvasTexture)
// ✅ Fire particles (Points)
// ✅ Spatial audio (PositionalAudio) "burning" loop
// ✅ Destination nodes (each node teleports to target position)
// ✅ Exposes raycast targets for controller/hand interactions

export const FireTeleportSystem = (() => {
  const state = {
    THREE: null,
    scene: null,
    camera: null,
    listener: null,

    root: null,
    nodes: [],
    targets: [], // invisible hit spheres for raycasts

    audio: {
      enabled: true,
      url: "https://cdn.aframe.io/basic-guide/audio/backgroundnoise.wav", // replace later if you want
      volume: 0.45,
      refDistance: 2.2,
      rolloff: 2.5
    }
  };

  function makeLavaEtchedTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const c = canvas.getContext("2d");

    // burnt wood base
    c.fillStyle = "#1a0d00";
    c.fillRect(0, 0, 512, 512);

    // subtle grain
    c.globalAlpha = 0.18;
    for (let i = 0; i < 130; i++) {
      const y = Math.random() * 512;
      c.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.07})`;
      c.fillRect(0, y, 512, 1 + Math.random() * 2);
    }
    c.globalAlpha = 1;

    // fire veins
    c.strokeStyle = "#ff4500";
    c.lineWidth = 3;
    for (let i = 0; i < 25; i++) {
      c.beginPath();
      let x = Math.random() * 512;
      let y = Math.random() * 512;
      c.moveTo(x, y);
      for (let j = 0; j < 10; j++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        c.lineTo(x, y);
      }
      c.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.anisotropy = 4;
    return tex;
  }

  function makeFireParticles(THREE, count = 650) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = Math.random() * 0.28;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3 + 0] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.random() * 0.25;
      pos[i * 3 + 2] = Math.sin(a) * r;

      vel[i * 3 + 0] = (Math.random() - 0.5) * 0.10;
      vel[i * 3 + 1] = 0.35 + Math.random() * 0.55;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.10;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("velocity", new THREE.BufferAttribute(vel, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xff7a00,
      size: 0.055,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData._fire = { count };

    return pts;
  }

  function updateFireParticles(THREE, points, dt) {
    const geo = points.geometry;
    const p = geo.getAttribute("position");
    const v = geo.getAttribute("velocity");

    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i);
      let y = p.getY(i);
      let z = p.getZ(i);

      x += v.getX(i) * dt;
      y += v.getY(i) * dt;
      z += v.getZ(i) * dt;

      // swirl
      const swirl = 0.9;
      x += Math.sin((y * 8) + i) * swirl * dt * 0.02;
      z += Math.cos((y * 8) + i) * swirl * dt * 0.02;

      // reset
      if (y > 1.15) {
        const r = Math.random() * 0.28;
        const a = Math.random() * Math.PI * 2;
        x = Math.cos(a) * r;
        y = Math.random() * 0.10;
        z = Math.sin(a) * r;
      }

      p.setXYZ(i, x, y, z);
    }

    p.needsUpdate = true;

    // tiny flicker
    const t = performance.now() * 0.001;
    points.material.opacity = 0.75 + Math.sin(t * 14) * 0.12;
  }

  async function makeSpatialFireAudio(THREE) {
    if (!state.audio.enabled) return null;
    if (!state.listener) return null;

    const audio = new THREE.PositionalAudio(state.listener);
    const loader = new THREE.AudioLoader();

    return new Promise((resolve) => {
      loader.load(
        state.audio.url,
        (buffer) => {
          audio.setBuffer(buffer);
          audio.setLoop(true);
          audio.setVolume(state.audio.volume);
          audio.setRefDistance(state.audio.refDistance);
          audio.setRolloffFactor(state.audio.rolloff);
          resolve(audio);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  async function createTeleporterNode({ id, position, destination, color = 0xff4500 }) {
    const { THREE } = state;

    const g = new THREE.Group();
    g.name = id;
    g.position.copy(position);

    const lavaTex = makeLavaEtchedTexture(THREE);

    const lavaMat = new THREE.MeshStandardMaterial({
      map: lavaTex,
      color: 0x1a0d00,
      roughness: 0.65,
      metalness: 0.12,
      emissive: new THREE.Color(0xff2200),
      emissiveIntensity: 0.55
    });

    // stand geometry (like your 3 A-Frame boxes)
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 0.6), lavaMat);
    base.position.set(0, 0.10, 0);
    g.add(base);

    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 0.4), lavaMat);
    stem.position.set(0.20, 0.70, 0);
    stem.rotation.z = THREE.MathUtils.degToRad(-20);
    g.add(stem);

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.6), lavaMat);
    top.position.set(0.45, 1.30, 0);
    g.add(top);

    // fire particles
    const fire = makeFireParticles(THREE, 650);
    fire.position.set(0.45, 1.35, 0);
    g.add(fire);

    // point light flicker
    const pl = new THREE.PointLight(color, 1.35, 6);
    pl.position.set(0.45, 1.35, 0);
    g.add(pl);

    // invisible teleport hit sphere
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.40, 18, 18),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    hit.name = `${id}_TeleportTarget`;
    hit.position.set(0.45, 1.50, 0);
    hit.userData.teleportTarget = destination.clone();
    hit.userData.teleportNodeId = id;
    hit.userData._fire = { fire, light: pl };
    g.add(hit);

    // spatial audio
    const audio = await makeSpatialFireAudio(THREE);
    if (audio) {
      audio.position.set(0.45, 1.35, 0);
      g.add(audio);
      // Start audio on first user gesture / session start
      hit.userData._audio = audio;
    }

    state.nodes.push(g);
    state.targets.push(hit);

    return g;
  }

  async function init({ THREE, scene, camera, log }) {
    state.THREE = THREE;
    state.scene = scene;
    state.camera = camera;

    // audio listener on camera
    try {
      state.listener = new THREE.AudioListener();
      camera.add(state.listener);
    } catch {
      state.listener = null;
    }

    state.root = new THREE.Group();
    state.root.name = "FireTeleportSystemRoot";
    scene.add(state.root);

    log?.("[fire] init ✅");

    return state;
  }

  async function addNode(opts) {
    const node = await createTeleporterNode(opts);
    state.root.add(node);
    return node;
  }

  function playAudioIfAny() {
    for (const t of state.targets) {
      const a = t.userData?._audio;
      try { if (a && !a.isPlaying) a.play(); } catch {}
    }
  }

  function update(dt) {
    // animate particles + flicker
    const { THREE } = state;
    for (const t of state.targets) {
      const f = t.userData?._fire?.fire;
      const l = t.userData?._fire?.light;
      if (f) updateFireParticles(THREE, f, dt);
      if (l) {
        const tt = performance.now() * 0.001;
        l.intensity = 0.95 + Math.sin(tt * 20) * 0.35;
      }
    }
  }

  return {
    init,
    addNode,
    update,
    playAudioIfAny,
    getTargets() { return state.targets; }
  };
})();
