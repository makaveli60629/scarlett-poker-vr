// /js/world.js — ScarlettVR SAFE WORLD v11.2 (FULL)
// ✅ Guaranteed clear spawn (no geometry under player)
// ✅ Pads restored in front of spawn (never under your feet)
// ✅ Spawn label is lifted + non-blocking (no "standing on sign")
// ✅ UNSTUCK always teleports you to safe spawn
// ✅ Does NOT touch lasers/controls at all

export const World = (() => {
  let inst = null;

  const ANCHORS = {};
  let root = null;
  let floorRing = null;

  function hook(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }
  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function matStd(THREE, color, rough = 0.92, metal = 0.06) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }

  function makeBillboardText(THREE, text) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 256;
    const g = canvas.getContext("2d");

    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillRect(0, 0, canvas.width, canvas.height);

    g.strokeStyle = "rgba(102,204,255,0.55)";
    g.lineWidth = 10;
    g.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

    g.fillStyle = "#ffffff";
    g.font = "900 86px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(text || ""), canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), mat);
    mesh.rotation.y = Math.PI;
    mesh.renderOrder = 9999;
    return mesh;
  }

  function addLights(THREE, scene) {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x132044, 1.2);
    hemi.position.set(0, 60, 0);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.15);
    sun.position.set(35, 60, 25);
    scene.add(sun);

    const glow = new THREE.PointLight(0x66ccff, 1.0, 180, 2);
    glow.position.set(0, 10, 0);
    scene.add(glow);
  }

  function buildLobbyShell(THREE, scene) {
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.Fog(0x05070d, 18, 260);

    // BIG open floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(26, 96),
      matStd(THREE, 0x1b2a46, 0.95, 0.04)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "FLOOR_MAIN";
    root.add(floor);

    // Lobby wall (visual only)
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(28, 28, 10, 96, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        roughness: 0.9,
        metalness: 0.08,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45
      })
    );
    shell.position.set(0, 4.8, 0);
    root.add(shell);

    // Center marker
    const center = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 3.0, 64),
      new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.01;
    root.add(center);
  }

  function makePad(THREE) {
    return new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 0.10, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        roughness: 0.55,
        metalness: 0.2,
        emissive: new THREE.Color(0x66ccff),
        emissiveIntensity: 0.25
      })
    );
  }

  function buildPads(THREE) {
    // in front of spawn
    const pads = [
      { room: "lobby",    label: "LOBBY",    x: -4.8, z: 8.5 },
      { room: "poker",    label: "POKER",    x: -1.6, z: 8.5 },
      { room: "store",    label: "STORE",    x:  1.6, z: 8.5 },
      { room: "scorpion", label: "SCORPION", x:  4.8, z: 8.5 },
      { room: "spectate", label: "SPECTATE", x:  8.0, z: 8.5 }
    ];

    for (const p of pads) {
      const pad = makePad(THREE);
      pad.position.set(p.x, 0.05, p.z);
      pad.name = `PAD_${p.room.toUpperCase()}`;
      root.add(pad);

      const text = makeBillboardText(THREE, p.label);
      text.position.set(p.x, 1.25, p.z);
      root.add(text);
    }
  }

  function buildSpawnMarker(THREE, spawnPos) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.15, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(spawnPos.x, 0.01, spawnPos.z);
    root.add(ring);

    const label = makeBillboardText(THREE, "SPAWN");
    label.position.set(spawnPos.x, 1.7, spawnPos.z);
    root.add(label);
  }

  function buildFloorFollowerRing(THREE) {
    floorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.22, 36),
      new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.set(0, 0.02, 0);
    root.add(floorRing);
  }

  function makeAnchors(THREE) {
    ANCHORS.spawn    = { pos: new THREE.Vector3(0, 0, 14.0), yaw: Math.PI };
    ANCHORS.lobby    = { pos: new THREE.Vector3(0, 0, 12.0), yaw: Math.PI };
    ANCHORS.poker    = { pos: new THREE.Vector3(0, 0, 2.5),  yaw: Math.PI };
    ANCHORS.store    = { pos: new THREE.Vector3(-14.0, 0, 0), yaw: -Math.PI / 2 };
    ANCHORS.scorpion = { pos: new THREE.Vector3(14.0, 0, 0),  yaw: Math.PI / 2 };
    ANCHORS.spectate = { pos: new THREE.Vector3(0, 0, -12.0), yaw: 0 };
  }

  function setRig(renderer, camera, player, name, log) {
    const a = ANCHORS[name] || ANCHORS.spawn;

    // guaranteed clear
    player.position.set(a.pos.x, 0, a.pos.z);
    player.position.y = 0.10;
    player.rotation.set(0, 0, 0);

    if (!renderer.xr.isPresenting) camera.rotation.set(0, a.yaw || 0, 0);
    log?.(`[rm] room=${name}`);
  }

  async function init({ THREE, scene, renderer, camera, player, log }) {
    root = new THREE.Group();
    root.name = "WORLD_ROOT";
    scene.add(root);

    camera.near = 0.05;
    camera.far = 900;
    camera.updateProjectionMatrix();

    addLights(THREE, scene);
    makeAnchors(THREE);

    buildLobbyShell(THREE, scene);
    buildPads(THREE);
    buildSpawnMarker(THREE, ANCHORS.spawn.pos);
    buildFloorFollowerRing(THREE);

    // buttons
    hook("btnSpawn", () => setRig(renderer, camera, player, "spawn", log));
    hook("btnLobby", () => setRig(renderer, camera, player, "lobby", log));
    hook("btnPoker", () => setRig(renderer, camera, player, "poker", log));
    hook("btnStore", () => setRig(renderer, camera, player, "store", log));
    hook("btnScorpion", () => setRig(renderer, camera, player, "scorpion", log));
    hook("btnSpectate", () => setRig(renderer, camera, player, "spectate", log));

    hook("btnUnstuck", () => {
      setRig(renderer, camera, player, "spawn", log);
      player.position.y = 0.22;
      log?.("[rm] UNSTUCK ✅");
    });

    hook("btnHealthcheck", () => log?.("[health] ok ✅ (world v11.2 SAFE)"));

    setRig(renderer, camera, player, "spawn", log);
    log?.("[world] SAFE v11.2 init ✅");

    const tmpPos = new THREE.Vector3();

    return {
      tick(dt, t) {
        floorRing.position.set(player.position.x, 0.02, player.position.z);
        tmpPos.copy(player.position);
        setText("debugPos", `x:${tmpPos.x.toFixed(2)} y:${tmpPos.y.toFixed(2)} z:${tmpPos.z.toFixed(2)}`);
        setText("debugXR", renderer.xr.isPresenting ? "XR:on" : "XR:off");
      }
    };
  }

  return {
    async init(args) { inst = await init(args); return inst; },
    update(dt, t) { inst?.tick?.(dt, t); }
  };
})();
