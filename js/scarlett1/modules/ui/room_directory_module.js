// /js/scarlett1/modules/ui/room_directory_module.js
// ROOM DIRECTORY MODULE (FULL) — Modular Forever
// - UI to spawn rooms + jump to a specific room (Game #)
// - Works in 2D + Quest browser safely (DOM overlay)
// - Uses ctx.rooms.ensure(n) from room_manager_module
// - Moves playerRig to the selected room's center + facing toward table

export function createRoomDirectoryModule({
  startRooms = 1,
  maxQuickRooms = 20,
  panelTitle = "ROOM DIRECTORY",
} = {}) {
  let ui = null;
  let lastSpawnN = startRooms;

  function clamp(n, a, b) {
    n = Math.floor(Number(n || 0));
    return Math.max(a, Math.min(b, n));
  }

  function ensureUI(ctx) {
    if (ui) return;

    // Root panel
    const panel = document.createElement("div");
    panel.setAttribute("data-hud", "1");
    panel.style.position = "fixed";
    panel.style.left = "12px";
    panel.style.bottom = "12px";
    panel.style.zIndex = "999999";
    panel.style.width = "320px";
    panel.style.maxWidth = "92vw";
    panel.style.padding = "12px";
    panel.style.borderRadius = "14px";
    panel.style.border = "1px solid rgba(255,255,255,0.16)";
    panel.style.background = "rgba(0,0,0,0.55)";
    panel.style.color = "white";
    panel.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    panel.style.backdropFilter = "blur(8px)";
    panel.style.webkitBackdropFilter = "blur(8px)";

    const title = document.createElement("div");
    title.textContent = panelTitle;
    title.style.fontWeight = "700";
    title.style.letterSpacing = "0.12em";
    title.style.fontSize = "12px";
    title.style.opacity = "0.9";
    title.style.marginBottom = "10px";
    panel.appendChild(title);

    const row1 = document.createElement("div");
    row1.style.display = "flex";
    row1.style.gap = "8px";
    row1.style.marginBottom = "10px";

    function mkBtn(label) {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.flex = "1";
      b.style.padding = "10px 10px";
      b.style.borderRadius = "12px";
      b.style.border = "1px solid rgba(255,255,255,0.18)";
      b.style.background = "rgba(20,20,30,0.7)";
      b.style.color = "white";
      b.style.fontSize = "13px";
      b.style.cursor = "pointer";
      return b;
    }

    const bSpawn5 = mkBtn("Spawn 5");
    const bSpawn10 = mkBtn("Spawn 10");
    const bSpawn20 = mkBtn("Spawn 20");
    row1.appendChild(bSpawn5);
    row1.appendChild(bSpawn10);
    row1.appendChild(bSpawn20);
    panel.appendChild(row1);

    const row2 = document.createElement("div");
    row2.style.display = "flex";
    row2.style.gap = "8px";
    row2.style.alignItems = "center";
    row2.style.marginBottom = "10px";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(maxQuickRooms);
    input.value = "1";
    input.placeholder = "Game #";
    input.style.flex = "1";
    input.style.padding = "10px";
    input.style.borderRadius = "12px";
    input.style.border = "1px solid rgba(255,255,255,0.18)";
    input.style.background = "rgba(0,0,0,0.35)";
    input.style.color = "white";
    input.style.fontSize = "13px";
    input.style.outline = "none";

    const bGo = mkBtn("Go");
    bGo.style.flex = "0 0 90px";

    row2.appendChild(input);
    row2.appendChild(bGo);
    panel.appendChild(row2);

    const status = document.createElement("div");
    status.style.fontSize = "12px";
    status.style.opacity = "0.85";
    status.textContent = "Rooms: 1";
    panel.appendChild(status);

    document.body.appendChild(panel);

    function spawn(n) {
      if (!ctx.rooms?.ensure) {
        status.textContent = "Room system not ready.";
        return;
      }
      const count = clamp(n, 1, maxQuickRooms);
      ctx.rooms.ensure(count);
      lastSpawnN = count;
      status.textContent = `Rooms: ${count} (Room #1 is SCORPION • MAIN TEST)`;
    }

    function goToRoom(n) {
      if (!ctx.rooms?.get) {
        status.textContent = "Room system not ready.";
        return;
      }

      const idx = clamp(n, 1, maxQuickRooms) - 1;
      const room = ctx.rooms.get(idx);

      if (!room?.group) {
        status.textContent = `Room #${idx + 1} not spawned. Spawn first.`;
        return;
      }

      // Move playerRig to the room center and face the room's forward direction.
      // Room group has transform in world space.
      const THREE = ctx.THREE;
      const wp = new THREE.Vector3();
      room.group.getWorldPosition(wp);

      // Place player slightly toward entry marker (front of room)
      const q = new THREE.Quaternion();
      room.group.getWorldQuaternion(q);

      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();
      const offset = fwd.clone().multiplyScalar(2.2); // spawn point inside room

      ctx.playerRig.position.set(wp.x + offset.x, 0, wp.z + offset.z);

      // Face into the room (look toward center)
      // We rotate rig yaw to match room yaw
      const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
      ctx.playerRig.rotation.set(0, e.y, 0);

      status.textContent = `Teleported to Room #${idx + 1}`;
    }

    // Wire actions
    bSpawn5.onclick = () => spawn(5);
    bSpawn10.onclick = () => spawn(10);
    bSpawn20.onclick = () => spawn(20);

    bGo.onclick = () => goToRoom(input.value);

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") goToRoom(input.value);
    });

    // Spawn initial rooms
    setTimeout(() => spawn(startRooms), 50);

    ui = { panel, status, input, spawn, goToRoom };
  }

  return {
    name: "room_directory",
    onEnable(ctx) {
      // DOM may not be ready instantly; retry safely
      ensureUI(ctx);
      setTimeout(() => ensureUI(ctx), 200);
      setTimeout(() => ensureUI(ctx), 900);
    },
    update(ctx) {
      // Keep status accurate if rooms changed elsewhere
      if (!ui?.status || !ctx.rooms?.list) return;
      const count = ctx.rooms.list().length || lastSpawnN || 1;
      ui.status.textContent = `Rooms: ${count} (Room #1 is SCORPION • MAIN TEST)`;
    },
  };
}
