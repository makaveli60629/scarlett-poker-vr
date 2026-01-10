// /js/room_manager.js — RoomManager v7.4 (BOOT LOBBY HARD + VISIBILITY)

export const RoomManager = {
  init(ctx) {
    ctx.rooms = ctx.rooms || {};
    ctx.rooms.current = "lobby";

    const setRoom = (name) => {
      ctx.rooms.current = name;
      console.log(`[rm] room=${name}`);

      // Toggle scorpion visibility
      if (ctx.ScorpionRoom?.setActive) ctx.ScorpionRoom.setActive(name === "scorpion");

      // Spawn per room
      const spawnName =
        name === "scorpion" ? "scorpion_safe_spawn" :
        name === "store" ? "store_spawn" :
        name === "spectator" ? "spectator" :
        "lobby_spawn";

      ctx.spawns?.apply?.(spawnName);

      // re-apply after a tick to beat late transforms
      setTimeout(() => ctx.spawns?.apply?.(spawnName), 250);
    };

    ctx.rooms.setRoom = setRoom;

    // ✅ ALWAYS boot lobby
    setRoom("lobby");

    // ✅ FORCE lobby again after UI builds (if UI tries to auto-enter scorpion)
    setTimeout(() => setRoom("lobby"), 600);

    console.log("[rm] init ✅ v7.4");
    return ctx.rooms;
  }
};
