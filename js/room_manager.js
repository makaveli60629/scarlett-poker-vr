export const RoomManager = {
  init(ctx) {
    ctx.room = "lobby";
    ctx.log?.("[rm] init ✅ room=lobby");

    // listen for teleport events (from TeleportMachine or android quick keys)
    window.addEventListener("scarlett_room", (e) => {
      const room = e.detail?.room;
      if (!room) return;
      this.setRoom(ctx, room);
    });

    return true;
  },

  setRoom(ctx, room) {
    const a = ctx.anchors?.[room];
    if (!a) { ctx.log?.(`[rm] setRoom invalid: ${room}`); return false; }
    ctx.rig.position.set(a.x, a.y, a.z);
    ctx.room = room;
    ctx.log?.(`[rm] setRoom → ${room}`);
    return true;
  }
};
