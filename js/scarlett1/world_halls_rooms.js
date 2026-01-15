import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { DIMS, getCardinals } from "./world_constants.js";
import { setReceiveCast, addCollider, makeTextSprite } from "./world_helpers.js";

export function buildHallsAndRooms(world, mats, quality = "quest") {
  const { FLOOR_Y, HALL_W, HALL_L, ROOM_W, ROOM_L, ROOM_H, LOBBY_R } = DIMS;
  const { hallN, hallS, hallE, hallW, roomN, roomS, roomE, roomW } = getCardinals();

  const g = new THREE.Group();
  g.name = "HallsRooms";
  world.group.add(g);

  // Floors
  function addRectFloor(w, l, x, z, name) {
    const geo = new THREE.PlaneGeometry(w, l);
    const mesh = setReceiveCast(new THREE.Mesh(geo, mats.matCarpet), false, true);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, FLOOR_Y, z);
    mesh.name = name;
    g.add(mesh);
  }

  addRectFloor(HALL_W, HALL_L, hallN.x, hallN.z, "Hall_N_Floor");
  addRectFloor(HALL_W, HALL_L, hallS.x, hallS.z, "Hall_S_Floor");
  addRectFloor(HALL_W, HALL_L, hallE.x, hallE.z, "Hall_E_Floor");
  addRectFloor(HALL_W, HALL_L, hallW.x, hallW.z, "Hall_W_Floor");

  addRectFloor(ROOM_W, ROOM_L, roomN.x, roomN.z, "Room_STORE_Floor");
  addRectFloor(ROOM_W, ROOM_L, roomS.x, roomS.z, "Room_VIP_Floor");
  addRectFloor(ROOM_W, ROOM_L, roomE.x, roomE.z, "Room_SCORP_Floor");
  addRectFloor(ROOM_W, ROOM_L, roomW.x, roomW.z, "Room_GAMES_Floor");

  // Portal frames on lobby wall (visual)
  function addPortalFrame(x, z, yaw, label) {
    const frame = new THREE.Group();
    frame.position.set(x, FLOOR_Y + 2.2, z);
    frame.rotation.y = yaw;
    frame.name = `Portal_${label}`;
    g.add(frame);

    const outer = new THREE.Mesh(new THREE.BoxGeometry(HALL_W + 0.8, 3.8, 0.3), mats.matTrim);
    setReceiveCast(outer, true, true);
    frame.add(outer);

    const inner = new THREE.Mesh(new THREE.BoxGeometry(HALL_W + 0.2, 3.2, 0.31), mats.matWall);
    inner.position.z = 0.01;
    setReceiveCast(inner, false, true);
    frame.add(inner);

    const sign = makeTextSprite(label, { scale: 0.8 });
    sign.position.set(0, 2.3, 0.35);
    frame.add(sign);
    world.signs.push(sign);
  }

  addPortalFrame(0, LOBBY_R - 0.2, Math.PI, "STORE");
  addPortalFrame(0, -(LOBBY_R - 0.2), 0, "VIP");
  addPortalFrame(LOBBY_R - 0.2, 0, -Math.PI / 2, "SCORP");
  addPortalFrame(-(LOBBY_R - 0.2), 0, Math.PI / 2, "GAMES");

  // Hall walls
  function addHallWalls(center, axis, name) {
    const hg = new THREE.Group();
    hg.name = name;
    g.add(hg);

    const w = HALL_W;
    const l = HALL_L;
    const h = 4.2;
    const t = 0.35;

    if (axis === "z") {
      const left = new THREE.Mesh(new THREE.BoxGeometry(t, h, l), mats.matWall);
      left.position.set(center.x - w / 2 - t / 2, FLOOR_Y + h / 2, center.z);
      const right = left.clone();
      right.position.x = center.x + w / 2 + t / 2;

      setReceiveCast(left, false, true);
      setReceiveCast(right, false, true);
      hg.add(left, right);
      addCollider(world, left, "wall");
      addCollider(world, right, "wall");
    } else {
      const left = new THREE.Mesh(new THREE.BoxGeometry(l, h, t), mats.matWall);
      left.position.set(center.x, FLOOR_Y + h / 2, center.z - w / 2 - t / 2);
      const right = left.clone();
      right.position.z = center.z + w / 2 + t / 2;

      setReceiveCast(left, false, true);
      setReceiveCast(right, false, true);
      hg.add(left, right);
      addCollider(world, left, "wall");
      addCollider(world, right, "wall");
    }

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(axis === "z" ? w : l, 0.12, axis === "z" ? l : w),
      mats.matTrim
    );
    strip.position.set(center.x, FLOOR_Y + h - 0.1, center.z);
    setReceiveCast(strip, false, true);
    hg.add(strip);
  }

  addHallWalls(hallN, "z", "Hall_N_Walls");
  addHallWalls(hallS, "z", "Hall_S_Walls");
  addHallWalls(hallE, "x", "Hall_E_Walls");
  addHallWalls(hallW, "x", "Hall_W_Walls");

  // Room boxes
  function addRoomBox(room, label, theme) {
    const rg = new THREE.Group();
    rg.name = `Room_${label}`;
    g.add(rg);

    const w = ROOM_W, l = ROOM_L, h = ROOM_H, t = 0.4;

    function wallSeg(sx, sz, sw, sl, nm) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sw, h, sl), mats.matWall);
      m.position.set(room.x + sx, FLOOR_Y + h / 2, room.z + sz);
      m.name = nm;
      setReceiveCast(m, false, true);
      rg.add(m);
      addCollider(world, m, "wall");
    }

    wallSeg(0, -l / 2 - t / 2, w + t * 2, t, "Wall_South");
    wallSeg(0, +l / 2 + t / 2, w + t * 2, t, "Wall_North");
    wallSeg(-w / 2 - t / 2, 0, t, l + t * 2, "Wall_West");
    wallSeg(+w / 2 + t / 2, 0, t, l + t * 2, "Wall_East");

    const ceil = new THREE.Mesh(new THREE.BoxGeometry(w + t * 2, 0.25, l + t * 2), mats.matConcrete);
    ceil.position.set(room.x, FLOOR_Y + h + 0.12, room.z);
    setReceiveCast(ceil, false, true);
    rg.add(ceil);

    const themeMat =
      theme === "vip" ? mats.matGold :
      theme === "scorp" ? mats.matNeonPink :
      theme === "games" ? mats.matNeonCyan :
      mats.matTrim;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.08, 12, quality === "high" ? 140 : 98), themeMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(room.x, FLOOR_Y + h - 0.35, room.z);
    rg.add(ring);

    const spr = makeTextSprite(label, { scale: 1.0 });
    spr.position.set(room.x, FLOOR_Y + 3.8, room.z);
    world.group.add(spr);
    world.signs.push(spr);

    world.rooms[label] = { group: rg, center: new THREE.Vector3(room.x, FLOOR_Y, room.z), theme };
  }

  addRoomBox(roomN, "STORE", "store");
  addRoomBox(roomS, "VIP", "vip");
  addRoomBox(roomE, "SCORP", "scorp");
  addRoomBox(roomW, "GAMES", "games");

  return { group: g, cardinals: { hallN, hallS, hallE, hallW, roomN, roomS, roomE, roomW } };
}
