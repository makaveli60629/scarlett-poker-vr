// /js/room_manager.js — Room Manager (FULL)
// - Manages mode: lobby | table | scorpion | spectate
// - Provides: stand(), sit(seatIndex), spectate(), gotoScorpion(), gotoLobby(), recenter()

export const RoomManager = {
  init(ctx) {
    const { THREE, world, player, log } = ctx;
    const ui = (m) => (log ? log(m) : console.log(m));

    world.mode = world.mode || "lobby";
    world.seatedIndex = world.seatedIndex ?? -1;

    const spawnLobby = new THREE.Vector3(0, 1.6, 7.0);
    const spawnSpectate = new THREE.Vector3(0, 1.6, 4.2);

    function setPosYaw(pos, yaw = Math.PI) {
      player.position.copy(pos);
      player.rotation.set(0, yaw, 0);
    }

    world.gotoLobby = () => {
      world.mode = "lobby";
      world.seatedIndex = -1;
      setPosYaw(spawnLobby, Math.PI);
      ui("[rm] lobby");
    };

    world.spectate = () => {
      world.mode = "spectate";
      world.seatedIndex = -1;
      setPosYaw(spawnSpectate, Math.PI);
      ui("[rm] spectate");
    };

    world.gotoScorpion = () => {
      world.mode = "scorpion";
      world.seatedIndex = -1;
      const p = world.points?.scorpion ? world.points.scorpion.clone().add(new THREE.Vector3(0, 1.6, 2.5)) : new THREE.Vector3(7, 1.6, 2.5);
      setPosYaw(p, Math.PI);
      ui("[rm] scorpion");
    };

    world.sit = (seatIndex = 0) => {
      world.mode = "table";
      world.seatedIndex = seatIndex;
      const s = world.seats?.[seatIndex];
      if (s?.position) {
        setPosYaw(s.position.clone().add(new THREE.Vector3(0, 0, 0)), s.yaw ?? Math.PI);
      } else {
        setPosYaw(new THREE.Vector3(0, 1.6, 2.6), Math.PI);
      }
      ui("[rm] sit seat=" + seatIndex);
    };

    world.stand = () => world.gotoLobby();

    world.recenter = () => {
      // "recenter" means: go to current mode spawn
      if (world.mode === "table") world.sit(world.seatedIndex >= 0 ? world.seatedIndex : 0);
      else if (world.mode === "scorpion") world.gotoScorpion();
      else if (world.mode === "spectate") world.spectate();
      else world.gotoLobby();
      ui("[rm] recenter");
    };

    // default spawn
    if (!world.__spawnedOnce) {
      world.__spawnedOnce = true;
      world.gotoLobby();
    }

    ui("[rm] init ✅");
    return world;
  }
};
