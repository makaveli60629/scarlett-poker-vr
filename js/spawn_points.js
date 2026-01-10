// /js/spawn_points.js — Spawn pads + spawn registry (FULL)

export const SpawnPoints = {
  build({ THREE, scene, world, log }) {
    world.spawns = world.spawns || {};

    function addSpawn(name, position, yaw = 0, label = "") {
      world.spawns[name] = { position: position.clone(), yaw };

      // Visible pad
      const pad = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.34, 48),
        new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.9 })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.copy(position);
      pad.position.y = 0.02;
      pad.userData.spawnName = name;
      scene.add(pad);

      // Label (simple sprite-ish plane)
      const txt = makeTextPlane(THREE, label || name);
      txt.position.copy(position);
      txt.position.y = 1.35;
      txt.rotation.y = yaw;
      scene.add(txt);

      log?.(`[spawn] ✅ ${name}`);
    }

    // Lobby spawn (front of table area)
    addSpawn("lobby_spawn", new THREE.Vector3(0, 0, 3.2), Math.PI, "LOBBY SPAWN");

    // Table seat spawn (Scorpion room seat)
    addSpawn("table_seat_1", new THREE.Vector3(0, 0, 0.95), Math.PI, "SEAT 1");

    // Spectator spawn (behind rail)
    addSpawn("spectator", new THREE.Vector3(0, 0, -3.0), 0, "SPECTATE");

    return world.spawns;
  },
};

function makeTextPlane(THREE, text) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  g.clearRect(0, 0, c.width, c.height);

  g.fillStyle = "rgba(10,12,20,0.75)";
  roundRect(g, 24, 64, 464, 128, 24);
  g.fill();

  g.strokeStyle = "rgba(127,231,255,0.55)";
  g.lineWidth = 6;
  roundRect(g, 24, 64, 464, 128, 24);
  g.stroke();

  g.fillStyle = "rgba(232,236,255,0.95)";
  g.font = "bold 44px system-ui, Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(text).slice(0, 22), 256, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const geo = new THREE.PlaneGeometry(1.6, 0.8);
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 999;
  return m;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
