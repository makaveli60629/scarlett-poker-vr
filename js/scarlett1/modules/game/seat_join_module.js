// /js/scarlett1/modules/game/seat_join_module.js
// SEAT JOIN MODULE (FULL) — Modular Forever
// - Creates one "JOIN SEAT" zone at a chosen seat index
// - When player enters zone: "seated" = true
// - When seated: enables interaction (chips/dealer); when not: spectator mode
// Requires:
// - ctx._show.seats (from world_master_module)
// - interaction_policy_module enabled (it overrides ctx.canGrab)
//   This module will set spectator mode ON/OFF by calling ctx._interactionPolicy if present,
//   otherwise it will set ctx._seatSeated flag that policy module can read (see note below).

export function createSeatJoinModule({
  openSeatIndex = 4,          // seat index reserved for the player
  joinRadius = 1.05,          // distance from join point to consider "seated"
  standRadius = 1.45,         // hysteresis (prevents flicker)
  ui = true,                  // show seated status in HUD
} = {}) {
  let seated = false;
  let joinPoint = null;
  let hud = null;

  function ensureHUD() {
    if (!ui || hud) return;

    hud = document.createElement("div");
    hud.setAttribute("data-hud", "1");
    hud.style.position = "fixed";
    hud.style.right = "12px";
    hud.style.bottom = "12px";
    hud.style.zIndex = "999999";
    hud.style.padding = "10px 12px";
    hud.style.borderRadius = "12px";
    hud.style.border = "1px solid rgba(255,255,255,0.16)";
    hud.style.background = "rgba(0,0,0,0.55)";
    hud.style.color = "white";
    hud.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    hud.style.fontSize = "13px";
    hud.style.backdropFilter = "blur(8px)";
    hud.style.webkitBackdropFilter = "blur(8px)";
    hud.textContent = "Seat: NOT JOINED";
    document.body.appendChild(hud);
  }

  function setSeated(ctx, v) {
    seated = !!v;
    ctx._seatSeated = seated;

    // If interaction policy module exposes API, use it.
    // We’ll also support direct hook if you add it later.
    if (ctx._interactionPolicy?.setSpectatorMode) {
      // seated = allow interaction, so spectator mode OFF
      ctx._interactionPolicy.setSpectatorMode(!seated);
    }

    if (hud) hud.textContent = seated ? "Seat: JOINED ✅" : "Seat: NOT JOINED";
  }

  function worldPosOfJoin(ctx) {
    // Prefer joinPoint object if created, otherwise compute from seat
    if (joinPoint) {
      const wp = new ctx.THREE.Vector3();
      joinPoint.getWorldPosition(wp);
      return wp;
    }

    const seats = ctx._show?.seats || [];
    if (!seats.length) return null;

    const s = seats[Math.max(0, Math.min(openSeatIndex, seats.length - 1))];

    // Seat positions are in tableGroup local coordinates; convert to world
    const tg = ctx._show?.tableGroup;
    if (!tg) return null;

    const lp = new ctx.THREE.Vector3(s.x, 0, s.z);
    const wp = lp.clone();
    tg.localToWorld(wp);

    // Place join point just behind chair (away from table)
    const dir = lp.clone().normalize().multiplyScalar(0.55);
    wp.x += dir.x;
    wp.z += dir.z;
    wp.y = 0;

    return wp;
  }

  function installJoinMarker(ctx) {
    if (joinPoint) return;

    const THREE = ctx.THREE;
    const root = ctx._show?.root || ctx.scene;

    // Visible marker ring on the ground
    joinPoint = new THREE.Group();
    joinPoint.name = "JoinSeatPoint";

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.55, 48),
      new THREE.MeshStandardMaterial({ color: 0x101020, emissive: 0x33ffff, emissiveIntensity: 0.65, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.0, 12),
      new THREE.MeshStandardMaterial({ color: 0x101020, emissive: 0xff66ff, emissiveIntensity: 0.45 })
    );
    pillar.position.y = 0.5;

    joinPoint.add(ring);
    joinPoint.add(pillar);

    // Position it at the computed join world position
    const wp = worldPosOfJoin(ctx);
    if (wp) joinPoint.position.copy(wp);

    root.add(joinPoint);
  }

  function distXZ(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.hypot(dx, dz);
  }

  return {
    name: "seat_join",

    onEnable(ctx) {
      ensureHUD();

      // If interaction_policy exists, keep a reference if it stored itself on ctx
      // (We’ll also patch policy module below to store itself)
      // Not required, but helpful.

      // Install marker once world is ready
      setTimeout(() => installJoinMarker(ctx), 50);
      setTimeout(() => installJoinMarker(ctx), 300);

      // Default: not seated → spectator
      ctx._seatSeated = false;
    },

    update(ctx) {
      // Must have a world + table built
      if (!ctx._show?.tableGroup || !ctx.playerRig) return;

      // Ensure marker exists and is positioned
      if (!joinPoint) installJoinMarker(ctx);

      const jp = worldPosOfJoin(ctx);
      if (!jp) return;

      // player position
      const p = ctx.playerRig.position;

      // Hysteresis: join at joinRadius, stand at standRadius
      const d = distXZ(p, jp);

      if (!seated && d <= joinRadius) setSeated(ctx, true);
      if (seated && d >= standRadius) setSeated(ctx, false);
    },
  };
}
