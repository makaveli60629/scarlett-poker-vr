import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

function makePad(color = 0x44ccff) {
  const g = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.12, 18, 64),
    new THREE.MeshBasicMaterial({ color })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.03;
  g.add(ring);

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 48),
    new THREE.MeshBasicMaterial({ color: 0x00ff99, transparent: true, opacity: 0.16 })
  );
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.02;
  g.add(core);

  g.userData.isTeleportPad = true;
  return g;
}

export const TeleportMachine = {
  build(scene, rig, ctx) {
    // Ensure interactables list exists
    ctx.interactables = ctx.interactables || [];
    ctx.addInteractable = ctx.addInteractable || ((m) => (ctx.interactables.push(m), m));

    const lobbyPos = ctx.rooms?.lobby?.pos || new THREE.Vector3(0, 0, 0);
    const pokerPos = ctx.rooms?.poker?.pos || new THREE.Vector3(0, 0, -34);
    const storePos = ctx.rooms?.store?.pos || new THREE.Vector3(34, 0, 0);

    const pads = [];

    // Lobby pads -> Poker / Store
    const p1 = makePad(0x44ccff);
    p1.position.set(lobbyPos.x - 5, 0, lobbyPos.z - 4);
    p1.userData.room = "poker";
    ctx.addInteractable(p1);
    scene.add(p1);
    pads.push(p1);

    const p2 = makePad(0xff44cc);
    p2.position.set(lobbyPos.x + 5, 0, lobbyPos.z - 4);
    p2.userData.room = "store";
    ctx.addInteractable(p2);
    scene.add(p2);
    pads.push(p2);

    // Poker return -> Lobby
    const p3 = makePad(0x00ff99);
    p3.position.set(pokerPos.x - 6, 0, pokerPos.z + 8);
    p3.userData.room = "lobby";
    ctx.addInteractable(p3);
    scene.add(p3);
    pads.push(p3);

    // Store return -> Lobby
    const p4 = makePad(0x00ff99);
    p4.position.set(storePos.x - 6, 0, storePos.z + 8);
    p4.userData.room = "lobby";
    ctx.addInteractable(p4);
    scene.add(p4);
    pads.push(p4);

    // Hook interaction event
    if (ctx.on) {
      ctx.on("interact", ({ hit }) => {
        const root = hit?.object?.parent;
        const pad = root?.userData?.isTeleportPad ? root : hit?.object;
        const room = pad?.userData?.room;
        if (room && typeof ctx.setRoom === "function") {
          ctx.setRoom(room);
        }
      });
    }

    ctx.teleportPads = pads;
    return pads;
  },
};

export default TeleportMachine;
