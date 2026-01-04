import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function initUI({ scene, camera, renderer, world, playerGroup }) {
  // ---------- State ----------
  const state = {
    chips: 10000,
    menuVisible: true,
    hoverId: null
  };

  // ---------- Floating menu in front of camera (desktop/phone) ----------
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const tex = new THREE.CanvasTexture(canvas);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 0.62),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  panel.position.set(0, -0.15, -1.05);
  camera.add(panel);

  const buttons = [
    { id: "Lobby", label: "Teleport to Lobby" },
    { id: "PokerRoom", label: "Teleport to Poker Room" },
    { id: "Store", label: "Teleport to Store" },
    { id: "Buy", label: "Store: Buy +1000 Chips" },
    { id: "ResetChips", label: "Store: Reset Chips" },
    { id: "ResetPos", label: "Reset Position" }
  ];

  function teleportTo(label) {
    const t = world.markers?.[label];
    if (!t) return;
    playerGroup.position.set(t.x, 0, t.z);
  }

  function handleAction(id) {
    if (id === "Lobby") teleportTo("Lobby");
    if (id === "PokerRoom") teleportTo("PokerRoom");
    if (id === "Store") teleportTo("Store");

    if (id === "Buy") state.chips += 1000;
    if (id === "ResetChips") state.chips = 10000;

    if (id === "ResetPos") playerGroup.position.set(0, 0, 5);
  }

  // ---------- Phone joystick HUD ----------
  const phoneHud = document.createElement("div");
  phoneHud.style.position = "fixed";
  phoneHud.style.left = "16px";
  phoneHud.style.bottom = "90px";
  phoneHud.style.width = "140px";
  phoneHud.style.height = "140px";
  phoneHud.style.borderRadius = "999px";
  phoneHud.style.border = "2px solid rgba(255,255,255,0.25)";
  phoneHud.style.background = "rgba(0,0,0,0.15)";
  phoneHud.style.zIndex = "9999";
  phoneHud.style.display = "none";
  document.body.appendChild(phoneHud);

  const phoneDot = document.createElement("div");
  phoneDot.style.position = "absolute";
  phoneDot.style.left = "50%";
  phoneDot.style.top = "50%";
  phoneDot.style.width = "26px";
  phoneDot.style.height = "26px";
  phoneDot.style.marginLeft = "-13px";
  phoneDot.style.marginTop = "-13px";
  phoneDot.style.borderRadius = "999px";
  phoneDot.style.background = "rgba(0,255,180,0.75)";
  phoneHud.appendChild(phoneDot);

  function setPhoneJoystick({ active, x, y }) {
    phoneHud.style.display = active ? "block" : "none";
    const r = 50;
    phoneDot.style.transform = `translate(${x * r}px, ${y * r}px)`;
  }

  // ---------- Draw main menu panel ----------
  function draw(activeId = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(10,12,18,0.80)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 42px Arial";
    ctx.fillText("Scarlett Poker VR", 40, 66);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "26px Arial";
    ctx.fillText(`Chips: ${state.chips.toLocaleString()}`, 40, 110);

    const x = 40, w = 760, h = 64;
    let y = 150;

    for (const b of buttons) {
      const isActive = activeId === b.id;
      ctx.fillStyle = isActive ? "rgba(90,160,255,0.92)" : "rgba(255,255,255,0.10)";
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold 28px Arial";
      ctx.fillText(b.label, x + 18, y + 43);

      y += 78;
    }

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "22px Arial";
    ctx.fillText("Desktop: press M to toggle menu", 40, 488);

    tex.needsUpdate = true;
  }

  draw();

  // Desktop hover/click
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredBtn = null;

  function getButtonAtUV(uv) {
    const px = uv.x * canvas.width;
    const py = (1 - uv.y) * canvas.height;

    const bx = 40, bw = 760, bh = 64, by0 = 150, step = 78;
    if (px < bx || px > bx + bw) return null;

    for (let i = 0; i < buttons.length; i++) {
      const by = by0 + i * step;
      if (py >= by && py <= by + bh) return buttons[i];
    }
    return null;
  }

  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "m") {
      state.menuVisible = !state.menuVisible;
      panel.visible = state.menuVisible;
    }
  });

  window.addEventListener("pointermove", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  });

  window.addEventListener("click", () => {
    if (hoveredBtn) handleAction(hoveredBtn.id);
  });

  // ---------- Leaderboard hologram update ----------
  function drawLeaderboard() {
    if (!world.leaderboard) return;

    const { ctx: lctx, canvas: lcan, texture } = world.leaderboard;

    lctx.clearRect(0, 0, lcan.width, lcan.height);

    lctx.fillStyle = "rgba(0,0,0,0.35)";
    lctx.fillRect(0, 0, lcan.width, lcan.height);

    lctx.fillStyle = "rgba(0,255,255,0.9)";
    lctx.font = "bold 52px Arial";
    lctx.fillText("LEADERBOARD", 40, 70);

    lctx.fillStyle = "rgba(255,255,255,0.95)";
    lctx.font = "bold 40px Arial";
    lctx.fillText("Player", 60, 150);
    lctx.fillText("Chips", 720, 150);

    // Demo entries (you can replace later with real stats)
    const rows = [
      { name: "You", chips: state.chips },
      { name: "Nova Bot", chips: 12800 },
      { name: "Dealer Bot", chips: 9900 }
    ];

    let y = 220;
    lctx.font = "36px Arial";
    for (const r of rows) {
      lctx.fillStyle = r.name === "You" ? "rgba(0,255,180,0.95)" : "rgba(255,255,255,0.85)";
      lctx.fillText(r.name, 60, y);
      lctx.fillText(r.chips.toLocaleString(), 720, y);
      y += 70;
    }

    lctx.fillStyle = "rgba(255,255,255,0.6)";
    lctx.font = "24px Arial";
    lctx.fillText("Walk into portal rings to swap rooms", 40, 480);

    texture.needsUpdate = true;
  }

  function animateLeaderboard() {
    if (!world.leaderboard?.mesh) return;
    world.leaderboard.t = (world.leaderboard.t || 0) + 0.016;
    const m = world.leaderboard.mesh;

    // Hover effect
    m.position.y = 2.0 + Math.sin(world.leaderboard.t * 1.6) * 0.06;
  }

  // ---------- World interaction entry point (from controls.js) ----------
  function handleWorldAction(actionId) {
    if (actionId === "STORE_OPEN") {
      // Just
