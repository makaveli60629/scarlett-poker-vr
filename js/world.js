// /js/world.js — CASINO MASTER WORLD (PROOF SIGN + TABLE + 4 SEATED BOTS)

export function initWorld({ THREE, scene, log = console.log }) {
  const world = {
    THREE,
    scene,
    log,
    group: new THREE.Group(),
    spawn: new THREE.Vector3(0, 0, 8.0),
    pokerTable: null,
    tableBots: [],
    npcs: [],
    store: null,
    update(dt, camera) {
      if (world.pokerTable) world.pokerTable.update(dt, camera);
      for (const b of world.tableBots) b.update(dt);
    },
  };

  scene.add(world.group);
  scene.background = new THREE.Color(0x05060a);

  // Lights
  world.group.add(new THREE.HemisphereLight(0xcfefff, 0x0b1020, 1.05));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(6, 10, 5);
  world.group.add(key);

  // FLOOR
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x080b10, roughness: 1.0, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  world.group.add(floor);

  // ✅ PROOF SIGN (if you don't see this, world.js is NOT running)
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(14, 1.6, 0.25),
    new THREE.MeshStandardMaterial({
      color: 0x071018,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 3.0,
      roughness: 0.25,
      metalness: 0.35
    })
  );
  sign.position.set(0, 2.1, 6.2);
  world.group.add(sign);

  const signLight = new THREE.PointLight(0x7fe7ff, 1.3, 22, 2);
  signLight.position.set(0, 2.2, 6.0);
  world.group.add(signLight);

  // BIG RAIL so the table area is obvious
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.08, 16, 140),
    new THREE.MeshStandardMaterial({
      color: 0x0c1622,
      roughness: 0.55,
      metalness: 0.25,
      emissive: new THREE.Color(0x06121c),
      emissiveIntensity: 0.35
    })
  );
  rail.rotation.x = -Math.PI / 2;
  rail.position.set(0, 0.05, 0);
  world.group.add(rail);

  // TABLE + cards
  world.pokerTable = new PokerTable({ THREE, scene: world.group });

  // 4 SEATED BOTS
  const seatAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const seatR = 2.35;
  for (let i = 0; i < 4; i++) {
    const a = seatAngles[i];
    const seatPos = new THREE.Vector3(Math.sin(a) * seatR, 0, Math.cos(a) * seatR);

    const bot = new TableBot({
      THREE,
      color: i % 2 === 0 ? 0x7fe7ff : 0xff2d7a,
      position: seatPos
    });
    bot.group.lookAt(0, 0.9, 0);
    world.group.add(bot.group);
    world.tableBots.push(bot);

    const chair = makeChair({ THREE });
    chair.position.copy(seatPos);
    chair.lookAt(0, 0, 0);
    world.group.add(chair);
  }

  log("[world] CASINO MASTER LOADED ✅ (PROOF SIGN should be visible)");
  return world;
}

/* ---------- PokerTable ---------- */
export class PokerTable {
  constructor({ THREE, scene }) {
    this.group = new THREE.Group();
    this.community = [];
    scene.add(this.group);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.45, 0.22, 64),
      new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.65, metalness: 0.2 })
    );
    base.position.y = 0.11;

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(1.34, 1.34, 0.07, 80),
      new THREE.MeshStandardMaterial({
        color: 0x0f6b3b,
        roughness: 0.9,
        metalness: 0.0,
        emissive: new THREE.Color(0x04160d),
        emissiveIntensity: 0.35
      })
    );
    felt.position.y = 0.20;

    this.group.add(base, felt);
    this.tableTopY = 0.26;

    const face = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const back = new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.5 });
    const geo = new THREE.BoxGeometry(0.07, 0.0018, 0.095);
    const mats = [face, face, face, face, face, back];

    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(geo, mats);
      c.position.set((i - 2) * 0.085, this.tableTopY + 0.05, -0.20);
      c.rotation.x = -Math.PI / 2;
      this.group.add(c);
      this.community.push(c);
    }
  }

  update(dt, camera) {
    // (optional hover later)
  }
}

/* ---------- Chair ---------- */
function makeChair({ THREE }) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.8, metalness: 0.15 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), mat);
  seat.position.y = 0.50;
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.60, 0.08), mat);
  back.position.set(0, 0.82, -0.235);
  g.add(back);

  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.50, 12);
  const legs = [
    [-0.22, 0.25, -0.22],
    [0.22, 0.25, -0.22],
    [-0.22, 0.25, 0.22],
    [0.22, 0.25, 0.22],
  ];
  for (const [x, y, z] of legs) {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(x, y, z);
    g.add(leg);
  }
  return g;
}

/* ---------- TableBot ---------- */
class TableBot {
  constructor({ THREE, color, position }) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.22 });

    this.group = new THREE.Group();
    this.group.position.copy(position);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 10, 20), mat);
    torso.position.y = 1.00;
    this.group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18), mat);
    head.position.y = 1.45;
    this.group.add(head);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.95 });
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 14);

    const legL = new THREE.Mesh(legGeo, legMat);
    const legR = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.10, 0.40, 0.10);
    legR.position.set(0.10, 0.40, 0.10);
    this.group.add(legL, legR);

    this._t = Math.random() * 10;
  }
  update(dt) { this._t += dt; }
}

/* ---------- CyberAvatar exported so main can import it ---------- */
export class CyberAvatar {
  constructor({ THREE, scene, camera, log = console.log }) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;
    this.log = log;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a2332,
      emissive: 0x00ffff,
      emissiveIntensity: 1.0,
      roughness: 0.35,
      metalness: 0.35,
    });

    this.meshGroup = new THREE.Group();
    this.parts = {};

    this.parts.helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), mat);
    this.parts.torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.75, 0.25), mat);
    this.parts.torso.position.y = -0.55;

    const gloveGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.45, 16);
    this.parts.leftHand = new THREE.Mesh(gloveGeo, mat);
    this.parts.rightHand = new THREE.Mesh(gloveGeo, mat);

    this.parts.leftHand.rotation.x = Math.PI / 2;
    this.parts.rightHand.rotation.x = Math.PI / 2;

    this.parts.leftHand.visible = false;
    this.parts.rightHand.visible = false;

    this.meshGroup.add(this.parts.helmet, this.parts.torso, this.parts.leftHand, this.parts.rightHand);
    scene.add(this.meshGroup);

    this.log("[avatar] init ✅");
  }

  setHandsVisible(v) {}

  update(frame, refSpace, camera = this.camera) {
    if (!frame || !refSpace || !camera) return;
    this.parts.helmet.position.copy(camera.position);
    this.parts.helmet.quaternion.copy(camera.quaternion);

    // show gloves only when hand poses exist (optional later)
  }
    }
