// /js/world.js — Scarlett VR Poker (FULL) — No-Fallback World
// Contains: Lobby shell + Poker table + bots + chips + teleport + rays + movement.
// No external module imports besides THREE passed in from main.

export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, log;

  const state = {
    root: null,
    floor: null,

    // interaction
    raycaster: null,
    tmpMat: null,
    tmpDir: null,

    // laser
    lasers: [],

    // teleport
    teleport: {
      enabled: true,
      aiming: false,
      marker: null,
      hit: null,
      arc: null,
      arcPts: [],
      lastValid: false,
      cooldown: 0,
    },

    // movement
    move: {
      speed: 2.0,
      snap: Math.PI / 6,
      snapCooldown: 0,
    },

    // poker
    poker: {
      table: null,
      bots: [],
      chipPiles: [],
      t: 0,
    },

    // clickable things (for ray highlight)
    clickables: [],
    hovered: null,

    ready: false
  };

  async function init(ctx) {
    ({ THREE, scene, renderer, camera, player, controllers, log } = ctx);

    log("✅ LOADER SIGNATURE: WORLD.JS (NO-FALLBACK) ACTIVE");

    state.root = new THREE.Group();
    scene.add(state.root);

    // core utils
    state.raycaster = new THREE.Raycaster();
    state.tmpMat = new THREE.Matrix4();
    state.tmpDir = new THREE.Vector3();

    // Lighting (bright enough to never be “black”)
    addLights();

    // Environment (solid room)
    buildRoom();

    // Poker room (table + bots)
    buildPokerRoom();

    // Laser pointers (always)
    buildLasers();

    // Teleport
    buildTeleport();

    // Controller events
    wireControllerEvents();

    // Force spawn position & facing toward table
    forceSpawn();

    state.ready = true;
    log("ready ✅");
  }

  function addLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x334466, 1.1);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(6, 10, 4);
    key.castShadow = false;
    scene.add(key);

    const fill = new THREE.PointLight(0x88ccff, 0.8, 30);
    fill.position.set(-6, 3, -6);
    scene.add(fill);

    const warm = new THREE.PointLight(0xff88cc, 0.55, 30);
    warm.position.set(6, 3, -6);
    scene.add(warm);
  }

  function buildRoom() {
    // Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111218, roughness: 0.95, metalness: 0.0 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 64), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    floor.name = "floor";
    state.root.add(floor);
    state.floor = floor;

    // Walls (simple cylinder enclosure)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.9, metalness: 0.0 });
    const walls = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 6, 64, 1, true), wallMat);
    walls.position.y = 3;
    walls.name = "walls";
    state.root.add(walls);

    // Ceiling glow ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(10, 0.25, 16, 80),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x0a2a33, roughness: 0.4, metalness: 0.1 })
    );
    ring.position.set(0, 5.5, 0);
    ring.rotation.x = Math.PI / 2;
    state.root.add(ring);

    // Sign
    const sign = makeBillboardText("SCARLETT VR POKER", 2.2);
    sign.position.set(0, 2.4, -10);
    state.root.add(sign);
  }

  function buildPokerRoom() {
    const g = new THREE.Group();
    g.position.set(0, 0, 0);
    state.root.add(g);

    // Table base
    const table = new THREE.Group();
    table.position.set(0, 0, -2.0);
    g.add(table);

    // Felt top (oval)
    const felt = new THREE.Mesh(
      new THREE.CapsuleGeometry(2.1, 1.2, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0x0e5a3a, roughness: 0.9, metalness: 0.0 })
    );
    felt.rotation.x = Math.PI / 2;
    felt.position.y = 1.02;
    table.add(felt);

    // Rail
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.18, 18, 96),
      new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.8, metalness: 0.1 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 1.03;
    table.add(rail);

    // Pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.6, 1.0, 28),
      new THREE.MeshStandardMaterial({ color: 0x101019, roughness: 0.8, metalness: 0.2 })
    );
    ped.position.y = 0.5;
    table.add(ped);

    // Outer base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.35, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.8, metalness: 0.2 })
    );
    base.position.y = 0.06;
    table.add(base);

    // Center pot chip pile
    const pot = makeChipStack(18);
    pot.position.set(0, 1.05, 0);
    table.add(pot);
    state.poker.chipPiles.push(pot);

    // Seats + bots (8)
    const botCount = 8;
    const radius = 2.95;

    for (let i = 0; i < botCount; i++) {
      const ang = (i / botCount) * Math.PI * 2;

      // Chair
      const chair = makeChair();
      chair.position.set(Math.cos(ang) * radius, 0, table.position.z + Math.sin(ang) * radius);
      chair.rotation.y = -ang + Math.PI / 2;
      g.add(chair);

      // Bot
      const bot = makeBot(i);
      bot.position.set(Math.cos(ang) * (radius - 0.35), 0, table.position.z + Math.sin(ang) * (radius - 0.35));
      bot.lookAt(table.position.x, 1.3, table.position.z);
      g.add(bot);

      // Player chip stack
      const stack = makeChipStack(14 + (i % 6));
      stack.position.set(
        Math.cos(ang) * 1.65,
        1.05,
        table.position.z + Math.sin(ang) * 1.25
      );
      table.add(stack);
      state.poker.chipPiles.push(stack);

      state.poker.bots.push(bot);
    }

    // Simple “Start Hand” button (clickable)
    const btn = makeButton("START HAND");
    btn.position.set(0, 1.2, table.position.z + 2.8);
    btn.userData.onClick = () => {
      log("START HAND clicked ✅");
      flashFelt(felt);
      tossChipsToPot(table);
    };
    g.add(btn);
    state.clickables.push(btn);

    state.poker.table = table;

    // A second “Teleport Here” pad
    const pad = makeTeleportPad("TELEPORT PAD");
    pad.position.set(0, 0.01, table.position.z + 5.5);
    g.add(pad);
    state.clickables.push(pad);
  }

  function buildLasers() {
    state.lasers.length = 0;

    for (let i = 0; i < controllers.length; i++) {
      const c = controllers[i];

      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 });
      const line = new THREE.Line(geom, mat);
      line.scale.z = 10;
      line.name = "laser";
      c.add(line);

      // Cursor dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff2d7a })
      );
      dot.visible = false;
      scene.add(dot);

      state.lasers.push({ controller: c, line, dot });
    }

    log("lasers ready ✅");
  }

  function buildTeleport() {
    // Marker
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85 })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);
    state.teleport.marker = marker;

    // Arc line
    const arcGeom = new THREE.BufferGeometry();
    arcGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 40), 3));
    const arcMat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.65 });
    const arc = new THREE.Line(arcGeom, arcMat);
    arc.visible = false;
    scene.add(arc);
    state.teleport.arc = arc;

    log("teleport ready ✅");
  }

  function wireControllerEvents() {
    // Trigger = click
    for (const c of controllers) {
      c.addEventListener("selectstart", () => {
        // if aiming teleport, commit (if valid)
        if (state.teleport.aiming && state.teleport.lastValid && state.teleport.cooldown <= 0) {
          doTeleport();
          state.teleport.cooldown = 0.25;
          return;
        }
        // otherwise "click" whatever ray hits
        clickRay(c);
      });

      // Squeeze = aim teleport (hold)
      c.addEventListener("squeezestart", () => {
        state.teleport.aiming = true;
      });
      c.addEventListener("squeezeend", () => {
        state.teleport.aiming = false;
        state.teleport.marker.visible = false;
        state.teleport.arc.visible = false;
        state.teleport.lastValid = false;
      });
    }
  }

  function forceSpawn() {
    // Spawn near pad facing table
    player.position.set(0, 0, 4.0);

    // Face toward table at z=-2
    const target = new THREE.Vector3(0, 1.6, -2.0);
    const dir = target.clone().sub(new THREE.Vector3(player.position.x, 1.6, player.position.z)).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    player.rotation.set(0, yaw, 0);

    log("spawn forced ✅ pos=(0,0,4) facing table");
  }

  function update(dt) {
    if (!state.ready) return;

    // cooldowns
    state.move.snapCooldown = Math.max(0, state.move.snapCooldown - dt);
    state.teleport.cooldown = Math.max(0, state.teleport.cooldown - dt);

    // locomotion (left stick) + snap turn (right stick)
    locomotion(dt);

    // lasers + hover
    updateRays();

    // teleport aim arc
    if (state.teleport.aiming) {
      updateTeleportAim();
    }

    // simple bot idle animation
    state.poker.t += dt;
    for (let i = 0; i < state.poker.bots.length; i++) {
      const b = state.poker.bots[i];
      b.position.y = 0.02 * Math.sin(state.poker.t * 1.2 + i);
      b.rotation.y += 0.002 * Math.sin(state.poker.t + i);
    }
  }

  function locomotion(dt) {
    // pick a gamepad (prefer left controller)
    const left = controllers[0];
    const right = controllers[1];

    const la = left?.userData?.axes || [0, 0, 0, 0];
    const ra = right?.userData?.axes || [0, 0, 0, 0];

    // left stick move
    const mx = la[2] ?? la[0] ?? 0;  // some devices map differently
    const my = la[3] ?? la[1] ?? 0;

    const dead = 0.15;
    const ax = Math.abs(mx) > dead ? mx : 0;
    const ay = Math.abs(my) > dead ? my : 0;

    if (ax || ay) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
      forward.y = 0; forward.normalize();

      const rightV = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion);
      rightV.y = 0; rightV.normalize();

      const v = new THREE.Vector3();
      v.addScaledVector(rightV, ax);
      v.addScaledVector(forward, ay);
      v.normalize();

      player.position.addScaledVector(v, dt * state.move.speed);
    }

    // right stick snap turn
    const turnX = ra[2] ?? ra[0] ?? 0;
    if (state.move.snapCooldown <= 0 && Math.abs(turnX) > 0.65) {
      player.rotation.y -= Math.sign(turnX) * state.move.snap;
      state.move.snapCooldown = 0.28;
    }
  }

  function updateRays() {
    // For each controller, raycast to clickables (and floor for dot display)
    const objs = state.clickables;

    for (const laser of state.lasers) {
      const c = laser.controller;

      // ray origin & dir
      state.tmpMat.identity().extractRotation(c.matrixWorld);
      const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
      const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(state.tmpMat).normalize();

      state.raycaster.set(origin, dir);
      state.raycaster.far = 20;

      // priority: clickables
      const hits = state.raycaster.intersectObjects(objs, true);
      if (hits.length) {
        const h = hits[0];
        laser.dot.visible = true;
        laser.dot.position.copy(h.point);

        const hitObj = climbClickable(h.object);
        setHovered(hitObj);

        laser.line.scale.z = origin.distanceTo(h.point);
      } else {
        // no clickable hit → hide dot, clear hover
        laser.dot.visible = false;
        if (state.hovered) setHovered(null);

        // keep laser visible
        laser.line.scale.z = 10;
      }
    }
  }

  function climbClickable(obj) {
    let o = obj;
    while (o && !o.userData?.onClick && o.parent) o = o.parent;
    return o;
  }

  function setHovered(obj) {
    if (state.hovered === obj) return;

    // unhover old
    if (state.hovered) {
      state.hovered.traverse?.(n => {
        if (n.material && n.material.emissive) n.material.emissive.setHex(0x000000);
      });
    }

    state.hovered = obj;

    // hover new
    if (state.hovered) {
      state.hovered.traverse?.(n => {
        if (n.material && n.material.emissive) n.material.emissive.setHex(0x081a20);
      });
    }
  }

  function clickRay(controller) {
    const objs = state.clickables;

    state.tmpMat.identity().extractRotation(controller.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(state.tmpMat).normalize();

    state.raycaster.set(origin, dir);
    state.raycaster.far = 20;

    const hits = state.raycaster.intersectObjects(objs, true);
    if (!hits.length) return;

    const hitObj = climbClickable(hits[0].object);
    if (hitObj?.userData?.onClick) {
      hitObj.userData.onClick();
    }
  }

  function updateTeleportAim() {
    // Aim from right controller if exists, else left
    const c = controllers[1] || controllers[0];
    if (!c) return;

    // origin & forward
    state.tmpMat.identity().extractRotation(c.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    const forward = new THREE.Vector3(0, 0, -1).applyMatrix4(state.tmpMat).normalize();

    // simulate simple ballistic arc
    const g = new THREE.Vector3(0, -9.8, 0);
    const v0 = forward.clone().multiplyScalar(7.5);

    const pts = [];
    let last = origin.clone();
    let hit = null;

    for (let i = 0; i < 40; i++) {
      const t = i * 0.04;
      const p = origin.clone()
        .add(v0.clone().multiplyScalar(t))
        .add(g.clone().multiplyScalar(0.5 * t * t));

      pts.push(p);

      // ground hit
      if (p.y <= 0.02) {
        hit = p.clone();
        hit.y = 0.01;
        break;
      }
      last = p;
    }

    // update arc line
    const arc = state.teleport.arc;
    const pos = arc.geometry.attributes.position.array;

    for (let i = 0; i < 40; i++) {
      const p = pts[Math.min(i, pts.length - 1)] || last;
      pos[i * 3 + 0] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
    }
    arc.geometry.attributes.position.needsUpdate = true;
    arc.visible = true;

    // marker
    if (hit) {
      state.teleport.marker.position.copy(hit);
      state.teleport.marker.visible = true;
      state.teleport.hit = hit;
      state.teleport.lastValid = true;
    } else {
      state.teleport.marker.visible = false;
      state.teleport.hit = null;
      state.teleport.lastValid = false;
    }
  }

  function doTeleport() {
    const p = state.teleport.hit;
    if (!p) return;

    // keep head height stable: move rig to marker, y=0
    player.position.set(p.x, 0, p.z);
    log("teleported ✅", p.x.toFixed(2), p.z.toFixed(2));
  }

  // ---------- helpers / meshes ----------

  function makeChair() {
    const g = new THREE.Group();

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.08, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x14151d, roughness: 0.9 })
    );
    seat.position.y = 0.48;
    g.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x14151d, roughness: 0.9 })
    );
    back.position.set(0, 0.78, -0.235);
    g.add(back);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.8, metalness: 0.2 });
    const legGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 12);
    const lx = 0.23, lz = 0.23;

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(legGeom, legMat);
        leg.position.set(sx * lx, 0.225, sz * lz);
        g.add(leg);
      }
    }

    return g;
  }

  function makeBot(i) {
    const g = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 0.65, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.9 })
    );
    body.position.y = 1.05;
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 22, 22),
      new THREE.MeshStandardMaterial({ color: 0x222433, roughness: 0.65, metalness: 0.05 })
    );
    head.position.y = 1.55;
    g.add(head);

    // tiny “eyes” glow
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7fe7ff });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), eyeMat);
    eye.position.set(0.05, 1.56, 0.13);
    const eye2 = eye.clone();
    eye2.position.x = -0.05;
    g.add(eye, eye2);

    // ID badge
    const badge = makeBillboardText("BOT " + (i + 1), 0.38);
    badge.position.set(0, 1.85, 0);
    g.add(badge);

    return g;
  }

  function makeChipStack(n) {
    const g = new THREE.Group();
    const colors = [0xff2d7a, 0x7fe7ff, 0xffcc00, 0x4cd964, 0xffffff];

    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.4,
        metalness: 0.15
      });
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 18), mat);
      chip.position.y = i * 0.016;
      g.add(chip);
    }

    return g;
  }

  function makeButton(label) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.12, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.6, metalness: 0.2, emissive: 0x000000 })
    );
    base.position.y = 0.06;
    g.add(base);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.05, 0.20),
      new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.4, metalness: 0.1, emissive: 0x1a0010 })
    );
    top.position.y = 0.12;
    g.add(top);

    const t = makeBillboardText(label, 0.52);
    t.position.set(0, 0.26, 0);
    g.add(t);

    g.userData.onClick = () => {};
    return g;
  }

  function makeTeleportPad(label) {
    const g = new THREE.Group();

    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.8, metalness: 0.2, emissive: 0x000000 })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.01;
    g.add(pad);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.54, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    g.add(ring);

    const t = makeBillboardText(label, 0.52);
    t.position.set(0, 0.35, 0);
    g.add(t);

    g.userData.onClick = () => {
      // teleport directly to pad center
      player.position.set(g.position.x, 0, g.position.z);
      log("teleport pad clicked ✅");
    };

    return g;
  }

  function makeBillboardText(text, scale = 1) {
    // Ultra-simple canvas text sprite (no external font assets)
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 256;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(11,13,20,0.85)";
    roundRect(ctx, 24, 48, 464, 160, 28);
    ctx.fill();

    ctx.strokeStyle = "rgba(127,231,255,0.6)";
    ctx.lineWidth = 4;
    roundRect(ctx, 24, 48, 464, 160, 28);
    ctx.stroke();

    ctx.fillStyle = "#e8ecff";
    ctx.font = "bold 46px system-ui, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * scale, 0.8 * scale), mat);

    mesh.userData.billboard = true;

    // billboard update handled implicitly by lookAt in update loop if desired
    // (we keep it simple: always face camera during update via traversal)
    mesh.onBeforeRender = () => {
      mesh.quaternion.copy(camera.quaternion);
    };

    return mesh;
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

  function flashFelt(feltMesh) {
    const mat = feltMesh.material;
    const original = mat.color.getHex();
    mat.color.setHex(0x138a56);
    setTimeout(() => mat.color.setHex(original), 180);
  }

  function tossChipsToPot(table) {
    // quick visual: bounce all chip piles slightly toward center
    for (const pile of state.poker.chipPiles) {
      const v = new THREE.Vector3();
      pile.getWorldPosition(v);
      const local = table.worldToLocal(v.clone());

      // nudge toward center
      local.x *= 0.85;
      local.z *= 0.85;

      // animate
      const start = pile.position.clone();
      const end = new THREE.Vector3(local.x, start.y, local.z);
      const t0 = performance.now();
      const dur = 280;

      const step = () => {
        const t = (performance.now() - t0) / dur;
        const k = Math.min(1, t);
        pile.position.lerpVectors(start, end, easeOutCubic(k));
        if (k < 1) requestAnimationFrame(step);
      };
      step();
    }
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  return {
    init,
    update
  };
})();
