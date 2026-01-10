// /js/room_manager.js — RoomManager v7.3 (BOOT LOBBY HARD)

export const RoomManager = {
  init(ctx) {
    ctx.rooms = ctx.rooms || {};
    ctx.rooms.current = "lobby";

    function setRoom(name) {
      ctx.rooms.current = name;
      console.log(`[rm] room=${name}`);

      // show/hide scorpion room
      try {
        if (ctx.ScorpionRoom && typeof ctx.ScorpionRoom.setActive === "function") {
          ctx.ScorpionRoom.setActive(name === "scorpion");
        }
      } catch {}

      // choose spawn
      const spawnName =
        name === "scorpion" ? "scorpion_safe_spawn" :
        name === "store" ? "store_spawn" :
        name === "spectator" ? "spectator" :
        "lobby_spawn";

      ctx.spawns?.apply?.(spawnName);

      // re-apply after a tick to beat late transforms
      setTimeout(() => ctx.spawns?.apply?.(spawnName), 250);
    }

    ctx.rooms.setRoom = setRoom;

    // ✅ HARD START IN LOBBY
    setRoom("lobby");

    console.log("[rm] init ✅ v7.3 (boot lobby hard)");
    return ctx.rooms;
  }
};
