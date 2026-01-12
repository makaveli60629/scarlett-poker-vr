// /core/teleport_arc.js
// Teleport uses ARC collision targeting (segment casts) + rainbow arc visuals + ring.

export function createTeleportArcSystem({
  THREE, scene, camera, player, renderer,
  controllers,
  getColliders,
  log
}) {
  const raycaster = new THREE.Raycaster();

  const teleport = {
    active: true,
    valid: false,
    target: null,
    lastTeleportAt: 0,
    cooldown: 250,

    arc: {
      speed: 11.0,
      lift: 6.7,
      gravity: -14.0,
      timeMax: 1.75,
      steps: 38
    },

    ring: null,
    arcLine: null,
    points: 34
  };

  // ring
  function ensureRing() {
    if (teleport.ring) return;
    const g = new THREE.RingGeometry(0.22, 0.30, 28);
    const m = new THREE.MeshBasicMaterial({
      color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(g, m);
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    ring.name = "TeleportRing";
    scene.add(ring);
    teleport.ring = ring;
  }

  // rainbow arc
  function ensureArc() {
    if (teleport.arcLine) return;

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(teleport.points * 3);
    const col = new Float32Array(teleport.points * 3);

    for (let i = 0; i < teleport.points; i++) {
      pos[i * 3 + 0] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = -i / (teleport.points - 1);

      const h = i / (teleport.points - 1);
      const rgb = hsvToRgb(h, 0.95, 1.0);
      col[i * 3 + 0] = rgb.r;
      col[i * 3 + 1] = rgb.g;
      col[i * 3 + 2] = rgb.b;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.visible = false;
    line.name = "TeleportRainbowArc";

    // attach to right controller if possible
    (controllers.right || controllers.left)?.add(line);
    teleport.arcLine = line;

    log("[teleport] arc visuals ready ✅");
  }

  function getForward(obj) {
    const q = obj.getWorldQuaternion(new THREE.Quaternion());
    return new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();
  }

  function arcPoint(origin, forward, t) {
    const A = teleport.arc;
    const v = forward.clone().multiplyScalar(A.speed);
    v.y += A.lift;

    const p = origin.clone().addScaledVector(v, t);
    p.y += 0.5 * A.gravity * t * t;
    return p;
  }

  function segmentCast(p0, p1, colliders) {
    const dir = p1.clone().sub(p0);
    const len = dir.length();
    if (len < 1e-6) return null;
    dir.multiplyScalar(1 / len);

    raycaster.ray.origin.copy(p0);
    raycaster.ray.direction.copy(dir);
    raycaster.far = len;

    const hits = raycaster.intersectObjects(colliders, true);
    if (!hits || hits.length === 0) return null;
    return hits[0];
  }

  function computeTarget(controllerObj) {
    teleport.valid = false;
    teleport.target = null;

    const colliders = getColliders() || [];
    if (!colliders.length) return;

    const origin = controllerObj.getWorldPosition(new THREE.Vector3());
    const forward = getForward(controllerObj);

    const A = teleport.arc;
    const steps = Math.max(10, A.steps | 0);
    const dt = A.timeMax / steps;

    let prev = arcPoint(origin, forward, 0);

    for (let i = 1; i <= steps; i++) {
      const t = i * dt;
      const cur = arcPoint(origin, forward, t);

      const hit = segmentCast(prev, cur, colliders);
      if (hit) {
        const n = hit.face?.normal
          ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
          : null;

        // reject steep surfaces
        if (n && n.y < 0.45) {
          prev.copy(cur);
          continue;
        }

        teleport.valid = true;
        teleport.target = hit.point.clone();
        return;
      }

      prev.copy(cur);
    }
  }

  function updateArcVisual(controllerObj) {
    if (!teleport.arcLine) return;

    if (!teleport.valid || !teleport.target) {
      teleport.arcLine.visible = false;
      return;
    }

    teleport.arcLine.visible = true;

    const origin = controllerObj.getWorldPosition(new THREE.Vector3());
    const forward = getForward(controllerObj);

    // find bestT near target so the arc ends near ring
    const A = teleport.arc;
    const steps = Math.max(12, A.steps | 0);
    const dt = A.timeMax / steps;

    let bestT = A.timeMax;
    let bestD = Infinity;
    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      const p = arcPoint(origin, forward, t);
      const d = p.distanceTo(teleport.target);
      if (d < bestD) { bestD = d; bestT = t; }
    }

    const drawMax = clamp(bestT + dt * 0.5, 0.35, A.timeMax);

    const posAttr = teleport.arcLine.geometry.getAttribute("position");
    const inv = controllerObj.matrixWorld.clone().invert();

    for (let i = 0; i < teleport.points; i++) {
      const u = i / (teleport.points - 1);
      const t = u * drawMax;
      const pW = arcPoint(origin, forward, t);
      pW.applyMatrix4(inv);
      posAttr.setXYZ(i, pW.x, pW.y, pW.z);
    }
    posAttr.needsUpdate = true;
  }

  function showRing() {
    ensureRing();
    if (!teleport.valid || !teleport.target) {
      teleport.ring.visible = false;
      return;
    }
    teleport.ring.visible = true;
    teleport.ring.position.copy(teleport.target);
    teleport.ring.position.y += 0.02;
  }

  function doTeleport() {
    const now = performance.now();
    if (now - teleport.lastTeleportAt < teleport.cooldown) return;
    if (!teleport.valid || !teleport.target) return;

    const camWorld = camera.getWorldPosition(new THREE.Vector3());
    const delta = teleport.target.clone().sub(camWorld);
    delta.y = 0;

    player.position.add(delta);
    teleport.lastTeleportAt = now;
  }

  // hook select to teleport
  function bindSelect() {
    const L = controllers.left;
    const R = controllers.right;

    const onSelect = () => {
      if (!teleport.active) return;
      if (window.__SEATED_MODE === true) return;
      if (teleport.valid) doTeleport();
    };

    L?.addEventListener("selectstart", onSelect);
    R?.addEventListener("selectstart", onSelect);
  }

  bindSelect();
  ensureRing();
  ensureArc();

  function update({ seated }) {
    if (!teleport.active) return;

    if (seated) {
      if (teleport.ring) teleport.ring.visible = false;
      if (teleport.arcLine) teleport.arcLine.visible = false;
      return;
    }

    const c = controllers.right || controllers.left;
    if (!c) return;

    computeTarget(c);
    showRing();
    updateArcVisual(c);
  }

  return { update };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r, g, b };
}
