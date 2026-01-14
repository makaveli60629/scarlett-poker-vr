// /js/world.js — ScarlettVR PRIME WORLD v11.1 (FULL + GitHub-safe optional hands)
// ✅ NO bare imports (no `import 'three'`)
// ✅ Works with your index.js passing THREE into World.init()
// ✅ Circular lobby + pit divot + balcony + pads + anchors
// ✅ Optional hand tracking models via CDN (same version as index.js), but does NOT break controllers

export const World = (() => {
  let inst = null;

  // ---------- small DOM helpers ----------
  function hook(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }
  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  // ---------- materials ----------
  function matStd(THREE, color, rough = 0.88, metal = 0.12) {
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
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), mat);
    mesh.rotation.y = Math.PI;
    return mesh;
  }

  // ---------- lights ----------
  function addLights(THREE, root, scene) {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x132044, 1.15);
    hemi.position.set(0, 60, 0);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(35, 60, 25);
    scene.add(sun);

    const cyan = new THREE.PointLight(0x66ccff, 1.0, 140, 2);
    cyan.position.set(0, 10, 0);
    root.add(cyan);

    const warm = new THREE.PointLight(0xffd36b, 0.55, 90, 2);
    warm.position.set(0, 4.5, 10);
    root.add(warm);
  }

  // ---------- world geometry ----------
  function buildLobby(THREE, root, scene) {
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.Fog(0x05070d, 18, 220);

    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(23, 23, 11, 72, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        roughness: 0.9,
        metalness: 0.08,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.58
      })
    );
    shell.position.set(0, 4.6, 0);
    root.add(shell);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(18.5, 18.5, 0.35, 72),
      matStd(THREE, 0x1b2a46, 0.92, 0.06)
    );
    floor.position.set(0, -0.175, 0);
    root.add(floor);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      roughness: 0.35,
      metalness: 0.6,
      emissive: new THREE.Color(0x66ccff),
      emissiveIntensity: 0.55
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(16.6, 0.16, 12, 120), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.18, 0);
    root.add(ring);

    // door markers
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x0a1326, roughness: 0.4, metalness: 0.25,
      emissive: new THREE.Color(0x66ccff), emissiveIntensity: 0.18
    });
    const doorGeo = new THREE.BoxGeometry(3.2, 3.0, 0.25);
    const doors = [
      { x: 0, z: 18.0, r: Math.PI },
      { x: 0, z: -18.0, r: 0 },
      { x: 18.0, z: 0, r: -Math.PI / 2 },
      { x: -18.0, z: 0, r: Math.PI / 2 }
    ];
    for (const d of doors) {
      const m = new THREE.Mesh(doorGeo, doorMat);
      m.position.set(d.x, 1.6, d.z);
      m.rotation.y = d.r;
      root.add(m);
    }
  }

  function buildPit(THREE, root) {
    const pitRadius = 7.4;
    const pitDepth = 3.25;
    const pitFloorY = -pitDepth;

    const pitFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, 0.35, 72),
      matStd(THREE, 0x0c1220, 0.95, 0.04)
    );
    pitFloor.position.set(0, pitFloorY - 0.175, 0);
    root.add(pitFloor);

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 72, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0a101e, roughness: 0.95, metalness: 0.05, side: THREE.DoubleSide })
    );
    pitWall.position.set(0, pitFloorY / 2, 0);
    root.add(pitWall);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(3.35, 3.55, 0.35, 72),
      new THREE.MeshStandardMaterial({ color: 0x134536, roughness: 0.78, metalness: 0.04 })
    );
    felt.position.set(0, pitFloorY + 1.05, 0);
    felt.name = "TABLE_PAD";
    root.add(felt);

    const spot = new THREE.PointLight(0x66ccff, 0.75, 35, 2);
    spot.position.set(0, 3.5, 0);
    root.add(spot);

    return { pitFloorY };
  }

  function buildBalcony(THREE, root) {
    const y = 2.9;
    const balcony = new THREE.Mesh(
      new THREE.RingGeometry(13.8, 17.0, 128),
      matStd(THREE, 0x111a28, 0.92, 0.08)
    );
    balcony.rotation.x = -Math.PI / 2;
    balcony.position.y = y;
    root.add(balcony);

    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(14.05, 14.05, 1.0, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0a1326, roughness: 0.55, metalness: 0.22, side: THREE.DoubleSide })
    );
    rail.position.set(0, y + 0.55, 0);
    root.add(rail);
  }

  function buildPads(THREE, root) {
    const pads = [
      { room: "lobby",    label: "LOBBY",    x: -4.2, z: 10.9 },
      { room: "poker",    label: "POKER",    x: -1.4, z: 10.9 },
      { room: "store",    label: "STORE",    x:  1.4, z: 10.9 },
      { room: "scorpion", label: "SCORPION", x:  4.2, z: 10.9 },
      { room: "spectate", label: "SPECTATE", x:  7.0, z: 10.9 }
    ];

    for (const p of pads) {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.92, 0.92, 0.12, 32),
        new THREE.MeshStandardMaterial({
          color: 0x0b1220,
          roughness: 0.5,
          metalness: 0.25,
          emissive: new THREE.Color(0x66ccff),
          emissiveIntensity: 0.25
        })
      );
      pad.position.set(p.x, 0.06, p.z);
      pad.name = `PAD_${p.room.toUpperCase()}`;
      root.add(pad);

      const label = makeBillboardText(THREE, p.label);
      label.position.set(p.x, 1.2, p.z);
      root.add(label);
    }
  }

  // ---------- OPTIONAL HAND TRACKING ----------
  async function tryInstallHandModels({ THREE, renderer, scene, player, log }) {
    // Only attempt if session supports hands; safe to ignore if not.
    // Use the SAME three version as index.js: 0.158.0
    try {
      // Lazy import from CDN (GitHub-safe)
      const mod = await import("https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js");
      const XRHandModelFactory = mod?.XRHandModelFactory;
      if (!XRHandModelFactory) return;

      const factory = new XRHandModelFactory();

      const hand0 = renderer.xr.getHand(0);
      const hand1 = renderer.xr.getHand(1);

      // Parent hands to player rig (so they move with locomotion)
      player.add(hand0);
      player.add(hand1);

      const model0 = factory.createHandModel(hand0, "mesh");
      const model1 = factory.createHandModel(hand1, "mesh");
      hand0.add(model0);
      hand1.add(model1);

      log?.("[world] hand models installed ✅");
    } catch (e) {
      // Not fatal. Most sessions will still use controllers.
      log?.("[world] hand models not available (ok): " + (e?.message || e));
    }
  }

  // ---------- init / update ----------
  async function init({ THREE, scene, renderer, camera, player, log }) {
    const root = new THREE.Group();
    root.name = "WORLD_ROOT";
    scene.add(root);

    // camera safety
    camera.near = 0.05;
    camera.far = 650;
    camera.updateProjectionMatrix();

    addLights(THREE, root, scene);
    buildLobby(THREE, root, scene);
    const pit = buildPit(THREE, root);
    buildBalcony(THREE, root);
    buildPads(THREE, root);

    const anchors = {
      spawn:    { pos: new THREE.Vector3(0, 0, 16.5), yaw: Math.PI },
      lobby:    { pos: new THREE.Vector3(0, 0, 12.5), yaw: Math.PI },
      poker:    { pos: new THREE.Vector3(0, pit.pitFloorY + 0.15, 3.0), yaw: Math.PI },
      store:    { pos: new THREE.Vector3(-14.0, 0, 0), yaw: -Math.PI / 2 },
      scorpion: { pos: new THREE.Vector3(14.0, 0, 0), yaw: Math.PI / 2 },
      spectate: { pos: new THREE.Vector3(0, 2.9, 14.2), yaw: Math.PI }
    };

    // spawn marker
    const spawnRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.15, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    spawnRing.rotation.x = -Math.PI / 2;
    spawnRing.position.set(anchors.spawn.pos.x, 0.02, anchors.spawn.pos.z);
    root.add(spawnRing);

    const spawnLabel = makeBillboardText(THREE, "SPAWN");
    spawnLabel.position.set(anchors.spawn.pos.x, 1.25, anchors.spawn.pos.z);
    root.add(spawnLabel);

    // floor-follow ring (not parented)
    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.22, 36),
      new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.set(0, 0.02, 0);
    root.add(floorRing);

    function setRig(name) {
      const a = anchors[name] || anchors.spawn;
      player.position.copy(a.pos);
      player.position.y += 0.08;
      player.rotation.set(0, 0, 0);
      if (!renderer.xr.isPresenting) camera.rotation.set(0, a.yaw || 0, 0);
      log?.(`[rm] room=${name}`);
    }

    function unstuck() {
      setRig("spawn");
      player.position.y += 0.10;
      log?.("[rm] UNSTUCK ✅");
    }

    // buttons
    hook("btnSpawn", () => setRig("spawn"));
    hook("btnLobby", () => setRig("lobby"));
    hook("btnPoker", () => setRig("poker"));
    hook("btnStore", () => setRig("store"));
    hook("btnScorpion", () => setRig("scorpion"));
    hook("btnSpectate", () => setRig("spectate"));
    hook("btnUnstuck", () => unstuck());
    hook("btnHealthcheck", () => log?.("[health] ok ✅ (world v11.1)"));

    // start
    setRig("spawn");
    log?.("[world] PRIME v11.1 init ✅ (full world restored)");

    // optional hands: install when XR session starts
    // (won’t break controllers; only adds models if available)
    renderer.xr.addEventListener?.("sessionstart", () => {
      tryInstallHandModels({ THREE, renderer, scene, player, log });
    });

    const tmp = new THREE.Vector3();
    return {
      tick(dt, t) {
        floorRing.position.set(player.position.x, 0.02, player.position.z);
        setText("debugXR", renderer.xr.isPresenting ? "XR:on" : "XR:off");
        tmp.copy(player.position);
        setText("debugPos", `x:${tmp.x.toFixed(2)} y:${tmp.y.toFixed(2)} z:${tmp.z.toFixed(2)}`);
      }
    };
  }

  return {
    async init(args) {
      inst = await init(args);
      return inst;
    },
    update(dt, t) {
      inst?.tick?.(dt, t);
    }
  };
})();
