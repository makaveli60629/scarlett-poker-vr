import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { DIMS, getCardinals } from "./world_constants.js";
import { setReceiveCast, makeTextSprite } from "./world_helpers.js";

export function buildFeatures(world, mats, quality = "quest") {
  const { FLOOR_Y, ROOM_L } = DIMS;
  const { roomN, roomS, roomE, roomW, LOBBY_R } = getCardinals();

  // Teleport pads
  const padGroup = new THREE.Group();
  padGroup.name = "TeleportPads";
  world.group.add(padGroup);

  function addPad(x, z, label, colorMat) {
    const g = new THREE.Group();
    g.position.set(x, FLOOR_Y + 0.01, z);
    g.name = `Pad_${label}`;
    padGroup.add(g);

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 40), colorMat);
    ring.rotation.x = -Math.PI / 2;
    setReceiveCast(ring, false, true);
    g.add(ring);

    const disk = new THREE.Mesh(new THREE.CircleGeometry(0.54, 40), mats.matConcrete);
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = -0.002;
    g.add(disk);

    const spr = makeTextSprite(label, { scale: 0.55, bgColor: "rgba(0,0,0,0.35)" });
    spr.position.set(0, 1.15, 0);
    g.add(spr);

    g.userData.teleport = true;
    g.userData.label = label;
    g.userData.target = new THREE.Vector3(x, FLOOR_Y, z);

    world.pads.push(g);
    return g;
  }

  // lobby pads (includes PASS LINE)
  addPad(0, 8.8, "PASS LINE", mats.matNeonPink);
  addPad(8.8, 0, "TABLE", mats.matNeonCyan);
  addPad(-8.8, 0, "LOUNGE", mats.matTrim);
  addPad(0, -8.8, "INFO", mats.matGold);

  // room entry pads
  addPad(roomN.x, roomN.z - ROOM_L / 2 + 2.0, "STORE IN", mats.matTrim);
  addPad(roomS.x, roomS.z + ROOM_L / 2 - 2.0, "VIP IN", mats.matGold);
  addPad(roomE.x - ROOM_L / 2 + 2.0, roomE.z, "SCORP IN", mats.matNeonPink);
  addPad(roomW.x + ROOM_L / 2 - 2.0, roomW.z, "GAMES IN", mats.matNeonCyan);

  // Jumbotrons
  const jumboGroup = new THREE.Group();
  jumboGroup.name = "Jumbotrons";
  world.group.add(jumboGroup);

  function addJumbotron(angle, label) {
    const r = DIMS.LOBBY_R - 1.2;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    const g = new THREE.Group();
    g.position.set(x, FLOOR_Y + 3.1, z);
    g.lookAt(0, FLOOR_Y + 2.6, 0);
    g.name = `Jumbo_${label}`;
    jumboGroup.add(g);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.2, 0.25), mats.matTrim);
    setReceiveCast(frame, true, true);
    g.add(frame);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 1.85),
      new THREE.MeshStandardMaterial({
        color: 0x0a0f14,
        roughness: 0.25,
        metalness: 0.35,
        emissive: new THREE.Color(0x081018),
        emissiveIntensity: 1.25
      })
    );
    screen.position.z = 0.14;
    g.add(screen);

    const spr = makeTextSprite(label, { scale: 0.6, bgColor: "rgba(0,0,0,0.25)" });
    spr.position.set(0, 1.4, 0.18);
    g.add(spr);

    world.jumbotrons.push({ group: g, screen, label, t: 0 });
  }

  addJumbotron(0, "SCARLETT VR POKER");
  addJumbotron(Math.PI / 2, "TABLE STATUS");
  addJumbotron(Math.PI, "VIP LEADERBOARD");
  addJumbotron(-Math.PI / 2, "STORE DEALS");

  // Mannequins in STORE
  const mannequinGroup = new THREE.Group();
  mannequinGroup.name = "Mannequins";
  world.group.add(mannequinGroup);

  function addMannequin(x, z, themeMat) {
    const g = new THREE.Group();
    g.position.set(x, FLOOR_Y, z);
    g.name = "Mannequin";
    mannequinGroup.add(g);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.18, 18), mats.matConcrete);
    base.position.y = 0.09;
    g.add(base);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.85, 6, 16), themeMat);
    torso.position.y = 1.05;
    setReceiveCast(torso, true, true);
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), themeMat);
    head.position.y = 1.65;
    g.add(head);

    const spr = makeTextSprite("EQUIP", { scale: 0.45 });
    spr.position.y = 2.05;
    g.add(spr);

    g.userData.shopItem = true;
    world.mannequins.push(g);

    // collider (invisible)
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 1.7, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    col.position.y = 0.85;
    col.userData.collider = true;
    col.userData.kind = "prop";
    g.add(col);
    world.colliders.push(col);
  }

  {
    const cx = roomN.x;
    const cz = roomN.z;
    const themeMat = mats.matTrim;
    const positions = [
      [-5, -4], [-2, -4], [1, -4], [4, -4],
      [-3, 2], [3, 2]
    ];
    for (const [dx, dz] of positions) addMannequin(cx + dx, cz + dz, themeMat);
  }

  // SCORP totem
  {
    const cx = roomE.x, cz = roomE.z;
    const tg = new THREE.Group();
    tg.name = "ScorpTotem";
    tg.position.set(cx, FLOOR_Y, cz);
    world.group.add(tg);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.55, 0.45, 24), mats.matConcrete);
    plinth.position.y = 0.22;
    tg.add(plinth);

    const spikeCount = 10;
    for (let i = 0; i < spikeCount; i++) {
      const a = (i / spikeCount) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.15, 10), mats.matNeonPink);
      s.position.set(Math.cos(a) * 0.95, 0.85, Math.sin(a) * 0.95);
      s.rotation.x = -Math.PI / 2;
      s.lookAt(0, 0.85, 0);
      tg.add(s);
    }

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 14), mats.matNeonPink);
    core.position.y = 1.25;
    tg.add(core);

    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 2.2, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    col.position.y = 1.1;
    col.userData.collider = true;
    col.userData.kind = "prop";
    tg.add(col);
    world.colliders.push(col);

    if (world.rooms.SCORP) world.rooms.SCORP.totem = tg;
  }

  return { padGroup, jumboGroup, mannequinGroup };
}
