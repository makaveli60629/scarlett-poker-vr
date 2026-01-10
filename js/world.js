// /js/world.js — Scarlett VR Poker — WORLD MASTER v12 (FULL, UPDATED, UPGRADED)
// ✅ NO external imports (Quest/GitHub safe)
// ✅ Uses ctx.THREE injected by main.js (REAL Three.js)
// ✅ Rooms: lobby / store / scorpion / spectate
// ✅ Laser pointers + click ray + hover glow
// ✅ Teleport (hold Grip/Squeeze to aim arc, Trigger to teleport)
// ✅ Thumbstick move + snap turn
// ✅ Solid room shell + spectator rail + teleport pads
// ✅ Poker table + bots + chips + simple “Start Hand” button

export const World = (() => {
  let THREE, scene, renderer, camera, player, controllers, log;

  const S = {
    ready: false,
    root: null,

    // interaction
    raycaster: null,
    tmpMat: null,

    // lasers
    lasers: [],

    // locomotion
    move: { speed: 2.1, snap: Math.PI / 6, snapCooldown: 0 },

    // teleport
    tp: {
      aiming: false,
      marker: null,
      arc: null,
      hit: null,
      lastValid: false,
      cooldown: 0
    },

    // rooms
    rooms: {
      current: "lobby",
      groups: {}, // lobby/store/scorpion/spectate
      pads: [] // teleport pads clickable
    },

    // clickables
    clickables: [],
    hovered: null,

    // poker sim visuals
    poker: {
      t: 0,
      table: null,
      felt: null,
      bots: [],
      chipPiles: [],
      community: [],
      hole: [], // per seat: [{c1,c2}]
      pot: null,
      handActive: false
    }
  };

  async function init(ctx) {
    ({ THREE, scene, renderer, camera, player, controllers, log } = ctx);

    log("✅ WORLD MASTER v12 active");

    S.root = new THREE.Group();
    scene.add(S.root);

    // core tools
    S.raycaster = new THREE.Raycaster();
    S.tmpMat = new THREE.Matrix4();

    // lighting + shell
    addLights();
    buildShell();

    // rooms
    buildRooms();

    // interaction
    buildLasers();
    buildTeleport();
    wireControllerEvents();

    // start state
    setRoom("lobby");
    forceSpawnForRoom("lobby");

    S.ready = true;
    log("ready ✅ room=lobby");
  }

  function update(dt) {
    if (!S.ready) return;

    // cooldowns
    S.move.snapCooldown = Math.max(0, S.move.snapCooldown - dt);
    S.tp.cooldown = Math.max(0, S.tp.cooldown - dt);

    // locomotion
    locomotion(dt);

    // rays + hover
    updateRays();

    // teleport aim
    if (S.tp.aiming) updateTeleportAim();

    // animate bots if poker room visible
    S.poker.t += dt;
    if (S.rooms.current === "scorpion") {
      for (let i = 0; i < S.poker.bots.length; i++) {
        const b = S.poker.bots[i];
        b.position.y = 0.02 * Math.sin(S.poker.t * 1.2 + i);
        b.rotation.y += 0.002 * Math.sin(S.poker.t + i * 0.7);
      }
      // subtle chip wobble when hand active
      if (S.poker.handActive && S.poker.pot) {
        S.poker.pot.rotation.y += dt * 0.6;
      }
    }
  }

  // =========================================================
  // ENVIRONMENT
  // =========================================================
  function addLights() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x273045, 1.1));

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(7, 12, 6);
    scene.add(key);

    const fill = new THREE.PointLight(0x88ccff, 0.7, 40);
    fill.position.set(-7, 3.3, -7);
    scene.add(fill);

    const warm = new THREE.PointLight(0xff88cc, 0.55, 40);
    warm.position.set(7, 3.3, -7);
    scene.add(warm);
  }

  function buildShell() {
    // floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(22, 96),
      new THREE.MeshStandardMaterial({ color: 0x0e0f16, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "floor";
    S.root.add(floor);

    // solid walls (cylinder)
    const walls = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 7, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x090b12, roughness: 0.9 })
    );
    walls.position.y = 3.5;
    walls.name = "walls";
    S.root.add(walls);

    // ceiling ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(13, 0.28, 18, 120),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0x07252c
      })
    );
    ring.position.set(0, 6.1, 0);
    ring.rotation.x = Math.PI / 2;
    S.root.add(ring);

    // center landmark
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 2.4, 20),
      new THREE.MeshStandardMaterial({ color: 0x10131e, roughness: 0.75, metalness: 0.2 })
    );
    pillar.position.set(0, 1.2, 0);
    S.root.add(pillar);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xff2d7a, emissive: 0x2a0012, roughness: 0.4, metalness: 0.1 })
    );
    orb.position.set(0, 2.55, 0);
    S.root.add(orb);

    const sign = makeBillboard("SCARLETT VR POKER", 2.2);
    sign.position.set(0, 2.45, -12.5);
    S.root.add(sign);

    // spectator rail ring (visual)
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(9.5, 0.09, 16, 140),
      new THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.65, metalness: 0.15 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.05;
    S.root.add(rail);

    const railGlow = new THREE.Mesh(
      new THREE.TorusGeometry(9.5, 0.03, 12, 140),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.15 })
    );
    railGlow.rotation.x = Math.PI / 2;
    railGlow.position.y = 0.06;
    S.root.add(railGlow);
  }

  // =========================================================
  // ROOMS
  // =========================================================
  function buildRooms() {
    S.rooms.groups.lobby = new THREE.Group();
    S.rooms.groups.store = new THREE.Group();
    S.rooms.groups.scorpion = new THREE.Group();
    S.rooms.groups.spectate = new THREE.Group();

    S.root.add(S.rooms.groups.lobby);
    S.root.add(S.rooms.groups.store);
    S.root.add(S.rooms.groups.scorpion);
    S.root.add(S.rooms.groups.spectate);

    buildLobby(S.rooms.groups.lobby);
    buildStore(S.rooms.groups.store);
    buildScorpion(S.rooms.groups.scorpion);
    buildSpectate(S.rooms.groups.spectate);

    // teleport pads in lobby to jump rooms
    makeRoomTeleportPads(S.rooms.groups.lobby);
  }

  function setRoom(name) {
    S.rooms.current = name;

    for (const k of Object.keys(S.rooms.groups)) {
      S.rooms.groups[k].visible = (k === name);
    }

    // hide teleport visuals when switching
    S.tp.aiming = false;
    S.tp.lastValid = false;
    if (S.tp.marker) S.tp.marker.visible = false;
    if (S.tp.arc) S.tp.arc.visible = false;

    log?.(`[hud] room=${name}`);
  }

  function forceSpawnForRoom(room) {
    // spawn + face toward point of interest
    if (room === "lobby") {
      player.position.set(0, 0, 6.5);
      faceYawToward(new THREE.Vector3(0, 1.6, 0));
    } else if (room === "store") {
      player.position.set(8.5, 0, 2.5);
      faceYawToward(new THREE.Vector3(8.5, 1.6, -2));
    } else if (room === "scorpion") {
      player.position.set(-8.5, 0, 4.5);
      faceYawToward(new THREE.Vector3(-8.5, 1.6, -2.5));
    } else if (room === "spectate") {
      player.position.set(0, 0, -9.8);
      faceYawToward(new THREE_toggleRefVector(0, 1.6, -2));
    }
  }

  function faceYawToward(target) {
    const pos = new THREE.Vector3(player.position.x, 1.6, player.position.z);
    const dir = target.clone().sub(pos);
    dir.y = 0;
    dir.normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    player.rotation.set(0, yaw, 0);
  }

  // (tiny helper to avoid new allocation in one place)
  function THREE_toggleRefVector(x, y, z) {
    return new THREE.Vector3(x, y, z);
  }

  function buildLobby(g) {
    const title = makeBillboard("LOBBY", 1.25);
    title.position.set(0, 2.2, 2.2);
    g.add(title);

    // center “portal” ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.08, 16, 72),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x05161a, roughness: 0.4, metalness: 0.1 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.06, 0);
    g.add(ring);

    const prompt = makeBillboard("Use pads to teleport rooms", 0.9);
    prompt.position.set(0, 1.6, 0.7);
    g.add(prompt);
  }

  function buildStore(g) {
    g.position.set(8.5, 0, 0);

    const title = makeBillboard("STORE", 1.25);
    title.position.set(0, 2.1, -2.5);
    g.add(title);

    // kiosk body
    const kiosk = new THREE.Group();
    kiosk.position.set(0, 0, -2.0);
    g.add(kiosk);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.05, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.75, metalness: 0.15 })
    );
    base.position.y = 0.52;
    kiosk.add(base);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.85, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.12, roughness: 0.1 })
    );
    glass.position.set(0, 1.15, 0.62);
    kiosk.add(glass);

    const label = makeBillboard("COMING SOON\n(Click back pad)", 0.75);
    label.position.set(0, 1.55, 0.68);
    kiosk.add(label);

    // return pad
    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, 1.8);
    back.userData.onClick = () => {
      setRoom("lobby");
      forceSpawnForRoom("lobby");
    };
    g.add(back);
    S.clickables.push(back);
  }

  function buildSpectate(g) {
    g.position.set(0, 0, -10.5);
    const title = makeBillboard("SPECTATE", 1.25);
    title.position.set(0, 2.2, 0);
    g.add(title);

    const note = makeBillboard("Spectator rail view\n(Back to Lobby on pad)", 0.85);
    note.position.set(0, 1.6, 0.8);
    g.add(note);

    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, 2.6);
    back.userData.onClick = () => {
      setRoom("lobby");
      forceSpawnForRoom("lobby");
    };
    g.add(back);
    S.clickables.push(back);
  }

  function buildScorpion(g) {
    g.position.set(-8.5, 0, 0);

    const title = makeBillboard("SCORPION ROOM", 1.05);
    title.position.set(0, 2.25, -3.4);
    g.add(title);

    // table group
    const table = new THREE.Group();
    table.position.set(0, 0, -2.5);
    g.add(table);
    S.poker.table = table;

    // felt (oval)
    const felt = new THREE.Mesh(
      new THREE.CapsuleGeometry(2.1, 1.2, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0x0e5a3a, roughness: 0.92 })
    );
    felt.rotation.x = Math.PI / 2;
    felt.position.y = 1.02;
    table.add(felt);
    S.poker.felt = felt;

    // rail
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.18, 18, 96),
      new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.82, metalness: 0.1 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 1.03;
    table.add(rail);

    // pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.6, 1.0, 28),
      new THREE.MeshStandardMaterial({ color: 0x101019, roughness: 0.85, metalness: 0.2 })
    );
    ped.position.y = 0.5;
    table.add(ped);

    // pot
    const pot = makeChipStack(22);
    pot.position.set(0, 1.05, 0);
    table.add(pot);
    S.poker.pot = pot;
    S.poker.chipPiles.push(pot);

    // chairs + bots (8)
    const botCount = 8;
    const radius = 2.95;

    for (let i = 0; i < botCount; i++) {
      const ang = (i / botCount) * Math.PI * 2;

      const chair = makeChair();
      chair.position.set(Math.cos(ang) * radius, 0, table.position.z + Math.sin(ang) * radius);
      chair.rotation.y = -ang + Math.PI / 2;
      g.add(chair);

      const bot = makeBot(i);
      bot.position.set(Math.cos(ang) * (radius - 0.35), 0, table.position.z + Math.sin(ang) * (radius - 0.35));
      bot.lookAt(table.position.x, 1.3, table.position.z);
      g.add(bot);
      S.poker.bots.push(bot);

      const stack = makeChipStack(12 + (i % 7));
      stack.position.set(Math.cos(ang) * 1.65, 1.05, table.position.z + Math.sin(ang) * 1.25);
      table.add(stack);
      S.poker.chipPiles.push(stack);
    }

    // button: start hand
    const start = makeButton("START HAND");
    start.position.set(0, 1.2, table.position.z + 2.85);
    start.userData.onClick = () => startHand();
    g.add(start);
    S.clickables.push(start);

    // back pad
    const back = makePad("BACK → LOBBY", 0x7fe7ff);
    back.position.set(0, 0.01, table.position.z + 6.2);
    back.userData.onClick = () => {
      setRoom("lobby");
      forceSpawnForRoom("lobby");
    };
    g.add(back);
    S.clickables.push(back);
  }

  function makeRoomTeleportPads(lobbyGroup) {
    const pads = [
      { label: "GO → STORE", color: 0x7fe7ff, pos: new THREE.Vector3(4.2, 0.01, 0), room: "store" },
      { label: "GO → SCORPION", color: 0xff2d7a, pos: new THREE.Vector3(-4.2, 0.01, 0), room: "scorpion" },
      { label: "GO → SPECTATE", color: 0xffcc00, pos: new THREE.Vector3(0, 0.01, -4.2), room: "spectate" }
    ];

    for (const p of pads) {
      const pad = makePad(p.label, p.color);
      pad.position.copy(p.pos);
      pad.userData.onClick = () => {
        setRoom(p.room);
        forceSpawnForRoom(p.room);
      };
      lobbyGroup.add(pad);
      S.clickables.push(pad);
      S.rooms.pads.push(pad);
    }
  }

  // =========================================================
  // POKER VISUAL SIM (simple)
  // =========================================================
  function startHand() {
    if (S.poker.handActive) return;
    S.poker.handActive = true;
    log?.("[poker] hand start ✅");

    // flash felt
    const mat = S.poker.felt.material;
    const original = mat.color.getHex();
    mat.color.setHex(0x138a56);
    setTimeout(() => mat.color.setHex(original), 180);

    // toss stacks slightly toward pot
    for (const pile of S.poker.chipPiles) {
      if (pile === S.poker.pot) continue;
      nudgeTowardCenter(pile, 0.85);
    }

    // quick end
    setTimeout(() => {
      S.poker.handActive = false;
      log?.("[poker] hand end ✅");
    }, 1400);
  }

  function nudgeTowardCenter(obj, factor) {
    if (!S.poker.table) return;
    const table = S.poker.table;

    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);
    const local = table.worldToLocal(worldPos.clone());

    const start = obj.position.clone();
    const end = new THREE.Vector3(local.x * factor, start.y, local.z * factor);
    const t0 = performance.now();
    const dur = 260;

    const step = () => {
      const t = (performance.now() - t0) / dur;
      const k = Math.min(1, t);
      obj.position.lerpVectors(start, end, 1 - Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }

  // =========================================================
  // INPUT: lasers, clicking, teleport, locomotion
  // =========================================================
  function buildLasers() {
    S.lasers.length = 0;

    for (let i = 0; i < controllers.length; i++) {
      const c = controllers[i];

      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.95 });
      const line = new THREE.Line(geom, mat);
      line.scale.z = 10;
      c.add(line);

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff2d7a })
      );
      dot.visible = false;
      scene.add(dot);

      S.lasers.push({ controller: c, line, dot });
    }

    log("lasers ready ✅");
  }

  function buildTeleport() {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85 })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);
    S.tp.marker = marker;

    const arcGeom = new THREE.BufferGeometry();
    arcGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 40), 3));
    const arcMat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.65 });
    const arc = new THREE.Line(arcGeom, arcMat);
    arc.visible = false;
    scene.add(arc);
    S.tp.arc = arc;

    log("teleport ready ✅");
  }

  function wireControllerEvents() {
    for (const c of controllers) {
      // Trigger: click OR teleport commit if aiming
      c.addEventListener("selectstart", () => {
        if (S.tp.aiming && S.tp.lastValid && S.tp.cooldown <= 0) {
          doTeleport();
          S.tp.cooldown = 0.25;
          return;
        }
        clickRay(c);
      });

      // Grip/Squeeze: aim teleport
      c.addEventListener("squeezestart", () => {
        S.tp.aiming = true;
      });
      c.addEventListener("squeezeend", () => {
        S.tp.aiming = false;
        S.tp.lastValid = false;
        if (S.tp.marker) S.tp.marker.visible = false;
        if (S.tp.arc) S.tp.arc.visible = false;
      });
    }
  }

  function locomotion(dt) {
    const left = controllers[0];
    const right = controllers[1];

    const la = left?.userData?.axes || [0, 0, 0, 0];
    const ra = right?.userData?.axes || [0, 0, 0, 0];

    // left stick move (some devices map 0/1, some 2/3)
    const mx = la[2] ?? la[0] ?? 0;
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

      player.position.addScaledVector(v, dt * S.move.speed);
    }

    // right stick snap turn
    const turnX = ra[2] ?? ra[0] ?? 0;
    if (S.move.snapCooldown <= 0 && Math.abs(turnX) > 0.65) {
      player.rotation.y -= Math.sign(turnX) * S.move.snap;
      S.move.snapCooldown = 0.28;
    }
  }

  function updateRays() {
    const objs = S.clickables;

    for (const laser of S.lasers) {
      const c = laser.controller;

      S.tmpMat.identity().extractRotation(c.matrixWorld);
      const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
      const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(S.tmpMat).normalize();

      S.raycaster.set(origin, dir);
      S.raycaster.far = 25;

      const hits = S.raycaster.intersectObjects(objs, true);
      if (hits.length) {
        const h = hits[0];
        laser.dot.visible = true;
        laser.dot.position.copy(h.point);
        laser.line.scale.z = origin.distanceTo(h.point);

        const hitObj = climbClickable(h.object);
        setHovered(hitObj);
      } else {
        laser.dot.visible = false;
        laser.line.scale.z = 10;
        setHovered(null);
      }
    }
  }

  function climbClickable(obj) {
    let o = obj;
    while (o && !o.userData?.onClick && o.parent) o = o.parent;
    return o;
  }

  function setHovered(obj) {
    if (S.hovered === obj) return;

    // unhover
    if (S.hovered) {
      S.hovered.traverse?.(n => {
        if (n.material && n.material.emissive) n.material.emissive.setHex(0x000000);
      });
    }

    S.hovered = obj;

    // hover
    if (S.hovered) {
      S.hovered.traverse?.(n => {
        if (n.material && n.material.emissive) n.material.emissive.setHex(0x081a20);
      });
    }
  }

  function clickRay(controller) {
    const objs = S.clickables;

    S.tmpMat.identity().extractRotation(controller.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(S.tmpMat).normalize();

    S.raycaster.set(origin, dir);
    S.raycaster.far = 25;

    const hits = S.raycaster.intersectObjects(objs, true);
    if (!hits.length) return;

    const hitObj = climbClickable(hits[0].object);
    if (hitObj?.userData?.onClick) hitObj.userData.onClick();
  }

  function updateTeleportAim() {
    const c = controllers[1] || controllers[0];
    if (!c) return;

    S.tmpMat.identity().extractRotation(c.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    const forward = new THREE.Vector3(0, 0, -1).applyMatrix4(S.tmpMat).normalize();

    // ballistic arc
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

      if (p.y <= 0.02) {
        hit = p.clone();
        hit.y = 0.01;
        break;
      }
      last = p;
    }

    // write arc buffer
    const arc = S.tp.arc;
    const pos = arc.geometry.attributes.position.array;

    for (let i = 0; i < 40; i++) {
      const p = pts[Math.min(i, pts.length - 1)] || last;
      pos[i * 3 + 0] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
    }
    arc.geometry.attributes.position.needsUpdate = true;
    arc.visible = true;

    if (hit) {
      S.tp.marker.position.copy(hit);
      S.tp.marker.visible = true;
      S.tp.hit = hit;
      S.tp.lastValid = true;
    } else {
      S.tp.marker.visible = false;
      S.tp.hit = null;
      S.tp.lastValid = false;
    }
  }

  function doTeleport() {
    const p = S.tp.hit;
    if (!p) return;
    player.position.set(p.x, 0, p.z);
    log?.("[tp] ✅", p.x.toFixed(2), p.z.toFixed(2));
  }

  // =========================================================
  // PRIMITIVES / UI OBJECTS
  // =========================================================
  function makePad(label, color) {
    const g = new THREE.Group();

    const disk = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.8, metalness: 0.2, emissive: 0x000000 })
    );
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = 0.01;
    g.add(disk);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.62, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    g.add(ring);

    const t = makeBillboard(label, 0.65);
    t.position.set(0, 0.38, 0);
    g.add(t);

    g.userData.onClick = () => {};
    return g;
  }

  function makeButton(label) {
    const g = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.12, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.6, metalness: 0.2, emissive: 0x000000 })
    );
    base.position.y = 0.06;
    g.add(base);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.90, 0.05, 0.21),
      new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.35, metalness: 0.12, emissive: 0x1a0010 })
    );
    top.position.y = 0.12;
    g.add(top);

    const t = makeBillboard(label, 0.55);
    t.position.set(0, 0.26, 0);
    g.add(t);

    g.userData.onClick = () => {};
    return g;
  }

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

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7fe7ff });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), eyeMat);
    eye.position.set(0.05, 1.56, 0.13);
    const eye2 = eye.clone();
    eye2.position.x = -0.05;
    g.add(eye, eye2);

    const badge = makeBillboard(`BOT ${i + 1}`, 0.35);
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

  function makeBillboard(text, scale = 1) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 256;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(11,13,20,0.86)";
    roundRect(ctx, 24, 48, 464, 160, 28);
    ctx.fill();

    ctx.strokeStyle = "rgba(127,231,255,0.55)";
    ctx.lineWidth = 4;
    roundRect(ctx, 24, 48, 464, 160, 28);
    ctx.stroke();

    ctx.fillStyle = "#e8ecff";
    ctx.font = "bold 44px system-ui, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lines = String(text).split("\n");
    if (lines.length === 1) {
      ctx.fillText(lines[0], 256, 128);
    } else {
      const baseY = 128 - (lines.length - 1) * 26;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 256, baseY + i * 52);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * scale, 0.8 * scale), mat);

    // always face camera
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

  return { init, update };
})();
