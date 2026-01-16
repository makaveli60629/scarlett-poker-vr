// /js/scarlett1/modules/world/lobby_hallways_module.js
// LOBBY + 4 HALLWAYS MODULE (FULL) — Modular Forever
// - Sealed circular lobby (floor + wall)
// - 4 hallways at cardinal directions
// - 4 door frames / portals (visual)
// - Neon trims for readability
// Safe for Quest: simple meshes only

export function createLobbyHallwaysModule({
  // Lobby
  lobbyRadius = 12.5,
  lobbyWallHeight = 4.2,
  lobbyFloorY = 0.0,

  // Hallways
  hallCount = 4,
  hallLength = 10.5,
  hallWidth = 3.8,
  hallHeight = 3.1,

  // Door frames at end of each hall
  doorWidth = 2.3,
  doorHeight = 2.6,
  doorDepth = 0.25,

  // Neon trim
  trimIntensity = 0.55,
} = {}) {
  let built = false;

  function mat(ctx, color, rough = 0.9, metal = 0.06) {
    return new ctx.THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }

  function matGlow(ctx, color, emissive, ei) {
    return new ctx.THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.15,
      emissive: new ctx.THREE.Color(emissive),
      emissiveIntensity: ei,
    });
  }

  function ringLine(ctx, radius, y, color = 0x33ffff, seg = 160) {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      pts.push(new ctx.THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius));
    }
    const geo = new ctx.THREE.BufferGeometry().setFromPoints(pts);
    return new ctx.THREE.Line(geo, new ctx.THREE.LineBasicMaterial({ color }));
  }

  function buildDoor(ctx, parent, x, y, z, yaw, labelColor = 0x33ffff) {
    const THREE = ctx.THREE;

    const g = new THREE.Group();
    g.name = "DoorFrame";
    g.position.set(x, y, z);
    g.rotation.y = yaw;

    const frameMat = matGlow(ctx, 0x101020, 0x112244, 0.25);
    const neonMat = matGlow(ctx, 0x0f0f18, labelColor, trimIntensity);

    // Two side posts
    const postGeo = new THREE.BoxGeometry(0.18, doorHeight, doorDepth);
    const left = new THREE.Mesh(postGeo, frameMat);
    const right = new THREE.Mesh(postGeo, frameMat);
    left.position.set(-doorWidth * 0.5, doorHeight * 0.5, 0);
    right.position.set(doorWidth * 0.5, doorHeight * 0.5, 0);

    // Top beam
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + 0.18, 0.18, doorDepth),
      frameMat
    );
    top.position.set(0, doorHeight, 0);

    // Neon strip above
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + 0.06, 0.06, 0.08),
      neonMat
    );
    strip.position.set(0, doorHeight + 0.10, doorDepth * 0.45);

    // “Portal plane” (invisible hit target for future click-to-teleport)
    const portalPlane = new THREE
