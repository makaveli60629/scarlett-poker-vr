// /js/scarlett1/world_parts/layout.js — Layout + Core v1.0
// Lobby + ring walls + 4 halls + 4 rooms + ceilings + signs + spawns
// Provides core context: renderer/scene/player/camera/materials/config

export function makeContext({ THREE, log }) {
  return { THREE, log: log || console.log };
}

export function makeCore(ctx) {
  const { THREE, log } = ctx;

  // ---------- Renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  document.body.style.margin = "0";
  document.body.style.background = "#000";
  document.body.appendChild(renderer.domElement);

  // ---------- Scene ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.Fog(0x05070d, 18, 260);

  // ---------- Player Rig ----------
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const cameraPitch = new THREE.Group();
  cameraPitch.name = "CameraPitch";
  player.add(cameraPitch);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 900);
  camera.position.set(0, 1.6, 0);
  cameraPitch.add(camera);

  scene.add(player);

  // ---------- Brighter Lights ----------
  scene.add(new THREE.AmbientLight(0xbfd7ff, 0.55));
  scene.add(new THREE.HemisphereLight(0xb9dcff, 0x10131a, 0.85));

  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(30, 55, 25);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x9bbcff, 0.45);
  fill.position.set(-35, 35, -25);
  scene.add(fill);

  const p1 = new THREE.PointLight(0x89c7ff, 0.9, 220, 2);
  p1.position.set(0, 18, 0);
  scene.add(p1);

  // ---------- Materials ----------
  const mats = {
    FLOOR: new THREE.MeshStandardMaterial({ color: 0x0a1323, roughness: 0.92, metalness: 0.02 }),
    HALL:  new THREE.MeshStandardMaterial({ color: 0x08111f, roughness: 0.95, metalness: 0.04 }),
    WALL:  new THREE.MeshStandardMaterial({ color: 0x070d17, roughness: 0.96, metalness: 0.05 }),
    TRIM:  new THREE.MeshStandardMaterial({ color: 0x132744, roughness: 0.55, metalness: 0.35 }),
    PAD:   new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.35, metalness: 0.2, emissive: 0x163060 }),
    GLASS: new THREE.MeshStandardMaterial({ color: 0x0a1a2c, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25 })
  };

  // ✅ Config lives here so “size” changes are ONE-LINE
  const cfg = {
    SCALE: 2.0,                 // world scale
    LOBBY_R: 18 * 2.0,
    WALL_H: 4.8 * 2.0,
    WALL_T: 0.55,
    HALL_W: 6.2 * 2.0,
    HALL_L: 16  * 2.0,
    ROOM_W: 18  * 2.0,
    ROOM_L: 18  * 2.0,
    DOOR_W: 5.6 * 2.0
  };

  // ---------- Helpers ----------
  const UP = new THREE.Vector3(0, 1, 0);
  const box = (w,h,d,mat) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  const cyl = (rt,rb,h,mat,seg=48) => new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), mat);
  const plane = (w,h,mat) => new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);

  function signCanvas(text) {
    const c = document.createElement("canvas");
    c.width = 768; c.height = 256;
    const g = c.getContext("2d");
    g.clearRect(0,0,c.width,c.height);
    g.fillStyle = "rgba(120,200,255,0.94)";
    g.font = "900 92px system-ui, Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, c.width/2, c.height/2);
    g.strokeStyle = "rgba(120,200,255,0.20)";
    g.lineWidth = 6;
    g.strokeRect(18, 18, c.width-36, c.height-36);
    return new THREE.CanvasTexture(c);
  }

  function addSign(text, pos, lookAt) {
    log(`sign: ${text}`);
    const tex = signCanvas(text);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const p = plane(6.5*cfg.SCALE*0.55, 2.1*cfg.SCALE*0.55, m);
    p.position.copy(pos);
    p.lookAt(lookAt);
    scene.add(p);
  }

  function buildLayout() {
    const { LOBBY_R, WALL_H, WALL_T, HALL_W, HALL_L, ROOM_W, ROOM_L, DOOR_W } = cfg;

    // Lobby floor + trim
    const lobbyFloor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R, 160), mats.FLOOR);
    lobbyFloor.rotation.x = -Math.PI/2;
    scene.add(lobbyFloor);

    const trim = new THREE.Mesh(new THREE.RingGeometry(LOBBY_R-0.9, LOBBY_R-0.3, 160), mats.TRIM);
    trim.rotation.x = -Math.PI/2;
    trim.position.y = 0.012;
    scene.add(trim);

    // Lobby ceiling (sealed)
    const lobbyCeil = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R + 1.0, 160), mats.WALL);
    lobbyCeil.rotation.x = Math.PI/2;
    lobbyCeil.position.y = WALL_H + 0.02;
    scene.add(lobbyCeil);

    // Ring walls with door gaps
    function addRingWalls() {
      const r = LOBBY_R - WALL_T/2;
      const circum = 2 * Math.PI * r;
      const segCount = 44;
      const segArc = circum / segCount;

      const doors = [
        { a: -Math.PI/2, label: "GAMES" },
        { a: 0,          label: "STORE" },
        { a: Math.PI/2,  label: "SCORP" },
        { a: Math.PI,    label: "VIP" }
      ];

      function isInDoorGap(theta) {
        for (const d of doors) {
          let diff = Math.atan2(Math.sin(theta - d.a), Math.cos(theta - d.a));
          const halfGap = (DOOR_W / r) * 0.55;
          if (Math.abs(diff) < halfGap) return true;
        }
        return false;
      }

      for (let i=0;i<segCount;i++) {
        const theta = (i/segCount)*Math.PI*2;
        if (isInDoorGap(theta)) continue;

        const w = segArc * 0.95;
        const wall = box(w, WALL_H, WALL_T, mats.WALL);
        wall.position.set(Math.cos(theta)*r, WALL_H/2, Math.sin(theta)*r);
        wall.rotation.y = -theta;
        scene.add(wall);

        const strip = box(w, 0.18, WALL_T+0.03, mats.TRIM);
        strip.position.set(wall.position.x, WALL_H-0.55, wall.position.z);
        strip.rotation.copy(wall.rotation);
        scene.add(strip);
      }

      for (const d of doors) {
        const frameR = LOBBY_R - WALL_T/2;
        const x = Math.cos(d.a) * frameR;
        const z = Math.sin(d.a) * frameR;

        const frame = box(DOOR_W+0.8, 3.6*cfg.SCALE*0.75, 0.28, mats.TRIM);
        frame.position.set(x, (3.6*cfg.SCALE*0.75)/2, z);
        frame.rotation.y = -d.a;
        scene.add(frame);

        const sPos = new THREE.Vector3(Math.cos(d.a)*(LOBBY_R-5.5), WALL_H-1.7, Math.sin(d.a)*(LOBBY_R-5.5));
        addSign(d.label, sPos, new THREE.Vector3(0, WALL_H-2.0, 0));
      }
    }
    addRingWalls();

    // Rooms list
    const rooms = [
      { id:"GAMES", doorA:-Math.PI/2, hallCenter:new THREE.Vector3(0,0, -(LOBBY_R + HALL_L/2 - 1.2*cfg.SCALE)), roomCenter:new THREE.Vector3(0,0, -(LOBBY_R + HALL_L + ROOM_L/2 - 2.0*cfg.SCALE)) },
      { id:"STORE", doorA:0,         hallCenter:new THREE.Vector3((LOBBY_R + HALL_L/2 - 1.2*cfg.SCALE),0,0), roomCenter:new THREE.Vector3((LOBBY_R + HALL_L + ROOM_L/2 - 2.0*cfg.SCALE),0,0) },
      { id:"SCORP", doorA:Math.PI/2, hallCenter:new THREE.Vector3(0,0, (LOBBY_R + HALL_L/2 - 1.2*cfg.SCALE)), roomCenter:new THREE.Vector3(0,0, (LOBBY_R + HALL_L + ROOM_L/2 - 2.0*cfg.SCALE)) },
      { id:"VIP",   doorA:Math.PI,   hallCenter:new THREE.Vector3(-(LOBBY_R + HALL_L/2 - 1.2*cfg.SCALE),0,0), roomCenter:new THREE.Vector3(-(LOBBY_R + HALL_L + ROOM_L/2 - 2.0*cfg.SCALE),0,0) }
    ];

    function buildHallAndRoom(rm) {
      const hallFloor = box(HALL_W, 0.14, HALL_L, mats.HALL);
      hallFloor.position.set(rm.hallCenter.x, 0.07, rm.hallCenter.z);
      hallFloor.rotation.y = -rm.doorA;
      scene.add(hallFloor);

      const hallCeil = box(HALL_W, 0.18, HALL_L, mats.WALL);
      hallCeil.position.set(rm.hallCenter.x, cfg.WALL_H + 0.02, rm.hallCenter.z);
      hallCeil.rotation.y = -rm.doorA;
      scene.add(hallCeil);

      const sideWall = box(HALL_L, cfg.WALL_H, cfg.WALL_T, mats.WALL);

      const left = sideWall.clone();
      left.rotation.y = -rm.doorA + Math.PI/2;
      left.position.set(rm.hallCenter.x, cfg.WALL_H/2, rm.hallCenter.z);
      left.position.add(new THREE.Vector3(Math.cos(rm.doorA+Math.PI/2),0,Math.sin(rm.doorA+Math.PI/2)).multiplyScalar(HALL_W/2));
      scene.add(left);

      const right = sideWall.clone();
      right.rotation.y = -rm.doorA + Math.PI/2;
      right.position.set(rm.hallCenter.x, cfg.WALL_H/2, rm.hallCenter.z);
      right.position.add(new THREE.Vector3(Math.cos(rm.doorA-Math.PI/2),0,Math.sin(rm.doorA-Math.PI/2)).multiplyScalar(HALL_W/2));
      scene.add(right);

      const roomFloor = box(ROOM_W, 0.18, ROOM_L, mats.FLOOR);
      roomFloor.position.set(rm.roomCenter.x, 0.09, rm.roomCenter.z);
      roomFloor.rotation.y = -rm.doorA;
      scene.add(roomFloor);

      const roomCeil = box(ROOM_W, 0.18, ROOM_L, mats.WALL);
      roomCeil.position.set(rm.roomCenter.x, cfg.WALL_H + 0.02, rm.roomCenter.z);
      roomCeil.rotation.y = -rm.doorA;
      scene.add(roomCeil);

      const rotY = -rm.doorA;
      const hx = ROOM_W/2, hz = ROOM_L/2;

      function placeLocal(mesh, lx, ly, lz, ry=0) {
        const p = new THREE.Vector3(lx, ly, lz);
        p.applyAxisAngle(UP, rotY);
        mesh.position.set(rm.roomCenter.x + p.x, p.y, rm.roomCenter.z + p.z);
        mesh.rotation.y = rotY + ry;
        scene.add(mesh);
      }

      placeLocal(box(ROOM_W, cfg.WALL_H, cfg.WALL_T, mats.WALL), 0, cfg.WALL_H/2, -hz, 0);

      const segW = (ROOM_W - DOOR_W) / 2;
      placeLocal(box(segW, cfg.WALL_H, cfg.WALL_T, mats.WALL), -(DOOR_W/2 + segW/2), cfg.WALL_H/2, hz, 0);
      placeLocal(box(segW, cfg.WALL_H, cfg.WALL_T, mats.WALL),  (DOOR_W/2 + segW/2), cfg.WALL_H/2, hz, 0);

      placeLocal(box(ROOM_L, cfg.WALL_H, cfg.WALL_T, mats.WALL), -hx, cfg.WALL_H/2, 0, Math.PI/2);
      placeLocal(box(ROOM_L, cfg.WALL_H, cfg.WALL_T, mats.WALL),  hx, cfg.WALL_H/2, 0, Math.PI/2);

      const signPos = new THREE.Vector3(0, cfg.WALL_H-1.2, hz-1.3).applyAxisAngle(UP, rotY).add(rm.roomCenter.clone());
      addSign(rm.id, signPos, rm.roomCenter.clone().add(new THREE.Vector3(0, cfg.WALL_H-2.0, 0)));

      const glass = box(ROOM_W*0.55, 3.2, 0.12, mats.GLASS);
      placeLocal(glass, 0, 1.8, -hz+1.1, 0);
    }

    rooms.forEach(buildHallAndRoom);

    // Spawns
    const spawns = [];
    const pad = (name,x,z,yaw) => {
      const p = cyl(0.9,0.9,0.09,mats.PAD,28);
      p.position.set(x,0.05,z);
      p.name = name;
      scene.add(p);
      spawns.push({ name,x,z,yaw });
    };

    pad("SPAWN_N", 0, -(LOBBY_R - 6.0), Math.PI);
    pad("SPAWN_E", (LOBBY_R - 6.0), 0, -Math.PI/2);
    pad("SPAWN_S", 0, (LOBBY_R - 6.0), 0);
    pad("SPAWN_W", -(LOBBY_R - 6.0), 0, Math.PI/2);

    return { rooms, spawns };
  }

  // Spawn default
  function spawnAt(name = "SPAWN_N") {
    const layout = buildLayout();
    const s = layout.spawns.find(x => x.name === name) || layout.spawns[0];
    player.position.set(s.x, 0, s.z);
    player.rotation.y = s.yaw;
    log(`spawn ✅ ${s.name}`);
    return layout;
  }

  // We want layout built only once, so:
  let cachedLayout = null;
  function buildLayoutOnce() {
    if (cachedLayout) return cachedLayout;
    cachedLayout = buildLayout();
    const s = cachedLayout.spawns.find(x => x.name === "SPAWN_N") || cachedLayout.spawns[0];
    player.position.set(s.x, 0, s.z);
    player.rotation.y = s.yaw;
    log(`spawn ✅ ${s.name}`);
    return cachedLayout;
  }

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    renderer, scene, camera, player, cameraPitch,
    mats, cfg,
    UP,
    buildLayout: buildLayoutOnce
  };
               }
