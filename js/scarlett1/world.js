// /js/scarlett1/world.js — Scarlett 1 World v2 (XR-safe animation loop + global exports)
// Exports initWorld({ THREE, DIAG })

export async function initWorld({ THREE, DIAG }) {
  const D = DIAG || console;
  D.log("initWorld() start");

  const app = document.getElementById("app");
  if (!app) throw new Error("#app missing");

  // ---------- Renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true; // IMPORTANT: allow XR
  app.innerHTML = "";
  app.appendChild(renderer.domElement);

  // ---------- Scene / Camera ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    500
  );

  // Spawn: slightly forward of center circle
  const player = {
    pos: new THREE.Vector3(0, 1.65, 6.5),
    yaw: Math.PI, // facing toward center
    pitch: 0
  };
  camera.position.copy(player.pos);
  camera.rotation.order = "YXZ";
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.0));

  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(8, 14, 6);
  scene.add(dir);

  // Accent lights
  const blue = new THREE.PointLight(0x3366ff, 1.1, 40);
  blue.position.set(0, 6, 0);
  scene.add(blue);

  const purple = new THREE.PointLight(0xaa44ff, 0.8, 60);
  purple.position.set(-12, 5, -12);
  scene.add(purple);

  // ---------- Materials ----------
  const MAT_FLOOR = new THREE.MeshStandardMaterial({
    color: 0x0f1626,
    roughness: 1.0,
    metalness: 0.0
  });

  const MAT_WALL = new THREE.MeshStandardMaterial({
    color: 0x18233b,
    roughness: 0.95,
    metalness: 0.05
  });

  const MAT_TRIM = new THREE.MeshStandardMaterial({
    color: 0x2a3d66,
    roughness: 0.7,
    metalness: 0.15
  });

  function addMesh(geo, mat, x, y, z, ry = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  function addTextSign(text, x, y, z) {
    const g = new THREE.PlaneGeometry(4, 1.2);
    const m = new THREE.MeshStandardMaterial({
      color: 0x101a33,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x0a1530,
      emissiveIntensity: 0.6
    });
    const p = new THREE.Mesh(g, m);
    p.position.set(x, y, z);
    p.lookAt(0, y, 0);
    scene.add(p);

    const barMat = new THREE.MeshStandardMaterial({
      color: 0x2f6bff,
      roughness: 0.4,
      metalness: 0.2
    });
    for (let i = 0; i < 10; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.04), barMat);
      bar.position.set(x - 1.6 + i * 0.32, y + 0.05, z + 0.01);
      bar.lookAt(0, y, 0);
      scene.add(bar);
    }

    const title = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.12, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xffcc44, roughness: 0.5, metalness: 0.2 })
    );
    title.position.set(x, y + 0.38, z + 0.01);
    title.lookAt(0, y, 0);
    scene.add(title);

    D.log("sign:", text);
  }

  // ---------- WORLD SCALE ----------
  const LOBBY_RADIUS = 18;
  const LOBBY_FLOOR_R = 22;

  // Lobby floor
  const lobbyFloor = addMesh(new THREE.CircleGeometry(LOBBY_FLOOR_R, 96), MAT_FLOOR, 0, 0, 0);
  lobbyFloor.rotation.x = -Math.PI / 2;

  const ring = addMesh(
    new THREE.RingGeometry(LOBBY_RADIUS - 0.4, LOBBY_RADIUS + 0.4, 128),
    MAT_TRIM,
    0,
    0.01,
    0
  );
  ring.rotation.x = -Math.PI / 2;

  // Pit
  const pit = addMesh(
    new THREE.CircleGeometry(6.2, 80),
    new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 1, metalness: 0 }),
    0,
    -0.12,
    0
  );
  pit.rotation.x = -Math.PI / 2;

  const pitRim = addMesh(
    new THREE.RingGeometry(6.15, 6.5, 96),
    MAT_TRIM,
    0,
    -0.10,
    0
  );
  pitRim.rotation.x = -Math.PI / 2;

  const platform = addMesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b2a22, roughness: 0.85, metalness: 0.05 }),
    0,
    0.15,
    0
  );

  // Ring wall segments
  const wallH = 2.8;
  const segCount = 24;
  for (let i = 0; i < segCount; i++) {
    const a0 = (i / segCount) * Math.PI * 2;
    const a1 = ((i + 1) / segCount) * Math.PI * 2;
    const mx = Math.cos((a0 + a1) / 2) * LOBBY_RADIUS;
    const mz = Math.sin((a0 + a1) / 2) * LOBBY_RADIUS;
    const len = (Math.PI * 2 * LOBBY_RADIUS) / segCount;

    const w = new THREE.Mesh(new THREE.BoxGeometry(len, wallH, 0.45), MAT_WALL);
    w.position.set(mx, wallH / 2, mz);
    w.rotation.y = -((a0 + a1) / 2);
    scene.add(w);
  }

  // Rooms
  const HALL_LEN = 12;
  const HALL_W = 6;
  const ROOM_W = 16;
  const ROOM_D = 16;
  const ROOM_H = 4;

  const dirs = [
    { name: "STORE", angle: 0, color: 0x2f6bff },
    { name: "VIP", angle: Math.PI / 2, color: 0xaa44ff },
    { name: "SCORP", angle: Math.PI, color: 0xffcc44 },
    { name: "GAMES", angle: -Math.PI / 2, color: 0x44ffaa }
  ];

  function buildHallAndRoom(angle, roomName, accent) {
    const cx = Math.cos(angle);
    const cz = Math.sin(angle);

    const hallStartR = LOBBY_RADIUS - 1.2;
    const hallCenterR = hallStartR + HALL_LEN / 2;
    const hx = cx * hallCenterR;
    const hz = cz * hallCenterR;

    const hallFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_W, HALL_LEN),
      new THREE.MeshStandardMaterial({ color: 0x0b1222, roughness: 1, metalness: 0 })
    );
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(hx, 0.01, hz);
    hallFloor.rotation.z = angle;
    scene.add(hallFloor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x141f35,
      roughness: 0.95,
      metalness: 0.05,
      emissive: accent,
      emissiveIntensity: 0.08
    });

    const sideGeo = new THREE.BoxGeometry(HALL_LEN, 2.8, 0.35);
    const left = new THREE.Mesh(sideGeo, wallMat);
    const right = new THREE.Mesh(sideGeo, wallMat);

    const px = -cz;
    const pz = cx;

    left.position.set(hx + px * (HALL_W / 2), 1.4, hz + pz * (HALL_W / 2));
    right.position.set(hx - px * (HALL_W / 2), 1.4, hz - pz * (HALL_W / 2));
    left.rotation.y = angle;
    right.rotation.y = angle;
    scene.add(left);
    scene.add(right);

    const roomCenterR = hallStartR + HALL_LEN + ROOM_D / 2;
    const rx = cx * roomCenterR;
    const rz = cz * roomCenterR;

    const roomFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_W, ROOM_D),
      new THREE.MeshStandardMaterial({
        color: 0x0b1120,
        roughness: 1,
        metalness: 0,
        emissive: accent,
        emissiveIntensity: 0.05
      })
    );
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.position.set(rx, 0.01, rz);
    roomFloor.rotation.z = angle;
    scene.add(roomFloor);

    const room = new THREE.Mesh(
      new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D),
      new THREE.MeshStandardMaterial({
        color: 0x131c2f,
        roughness: 0.95,
        metalness: 0.05,
        emissive: accent,
        emissiveIntensity: 0.04
      })
    );
    room.position.set(rx, ROOM_H / 2, rz);
    room.rotation.y = angle;
    scene.add(room);

    addTextSign(roomName, rx, 2.6, rz);

    const pl = new THREE.PointLight(accent, 1.2, 40);
    pl.position.set(rx, 3.2, rz);
    scene.add(pl);
  }

  for (const d of dirs) buildHallAndRoom(d.angle, d.name, d.color);

  // Center table placeholder
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b3a2b, roughness: 0.85, metalness: 0.05 })
  );
  table.position.set(0, 1.05, 0);
  scene.add(table);

  // Resize
  window.addEventListener(
    "resize",
    () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    { passive: true }
  );

  // Basic touch look (kept)
  let looking = false;
  let lastX = 0, lastY = 0;

  function applyLook() {
    player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch));
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  }

  window.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      looking = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (looking && e.touches.length === 1) {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x;
      lastY = y;
      player.yaw -= dx * 0.004;
      player.pitch -= dy * 0.004;
      applyLook();
    }
  }, { passive: true });

  window.addEventListener("touchend", () => { looking = false; }, { passive: true });

  // Expose to XR module
  window.__SCARLETT1__ = { THREE, scene, camera, renderer, player };

  // XR-safe render loop
  D.log("render loop start ✅");
  renderer.setAnimationLoop((t) => {
    table.rotation.y = t * 0.0004;
    camera.position.copy(player.pos);
    renderer.render(scene, camera);
  });
      }
