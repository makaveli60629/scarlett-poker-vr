import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function initUI({ scene, camera, renderer, world, playerGroup }) {
  // ---------- State ----------
  const state = {
    chips: 10000,
    menuVisible: true
  };

  function teleportTo(label) {
    const t = world.markers?.[label];
    if (!t) return;
    playerGroup.position.set(t.x, 0, t.z);
  }

  function doAction(id) {
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

  // ---------- Desktop/Phone front menu panel ----------
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
    if (hoveredBtn) doAction(hoveredBtn.id);
  });

  // ---------- Leaderboard draw + hover ----------
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
    m.position.y = 2.0 + Math.sin(world.leaderboard.t * 1.6) * 0.06;
  }

  // ---------- VR Wrist (Watch) Menu ----------
  const wristCanvas = document.createElement("canvas");
  wristCanvas.width = 512;
  wristCanvas.height = 512;
  const wctx = wristCanvas.getContext("2d");
  const wristTex = new THREE.CanvasTexture(wristCanvas);

  const wristPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.20, 0.20),
    new THREE.MeshBasicMaterial({ map: wristTex, transparent: true })
  );
  wristPanel.visible = false;

  const wristButtons = [
    { id: "Lobby", label: "Lobby" },
    { id: "PokerRoom", label: "Poker" },
    { id: "Store", label: "Store" },
    { id: "Buy", label: "+1000" },
    { id: "ResetChips", label: "Reset" },
    { id: "ResetPos", label: "Home" }
  ];

  let wristHover = null;

  function drawWrist(activeId = null) {
    wctx.clearRect(0, 0, 512, 512);

    wctx.fillStyle = "rgba(0,0,0,0.55)";
    wctx.fillRect(0, 0, 512, 512);

    wctx.fillStyle = "rgba(0,255,255,0.92)";
    wctx.font = "bold 46px Arial";
    wctx.fillText("WATCH", 155, 60);

    wctx.fillStyle = "rgba(255,255,255,0.80)";
    wctx.font = "bold 34px Arial";
    wctx.fillText(`CHIPS ${state.chips.toLocaleString()}`, 70, 110);

    let y = 140;
    for (const b of wristButtons) {
      const isA = b.id === activeId;
      wctx.fillStyle = isA ? "rgba(90,160,255,0.95)" : "rgba(255,255,255,0.14)";
      wctx.fillRect(70, y, 372, 56);

      wctx.fillStyle = "rgba(255,255,255,0.92)";
      wctx.font = "bold 36px Arial";
      wctx.fillText(b.label, 120, y + 40);

      y += 68;
    }

    wristTex.needsUpdate = true;
  }

  function getWristButtonAtUV(uv) {
    const px = uv.x * 512;
    const py = (1 - uv.y) * 512;

    if (px < 70 || px > 442) return null;

    // buttons: y=140, step=68, height=56
    for (let i = 0; i < wristButtons.length; i++) {
      const y0 = 140 + i * 68;
      if (py >= y0 && py <= y0 + 56) return wristButtons[i];
    }
    return null;
  }

  // Attach to left grip
  const gripL = renderer.xr.getControllerGrip(0);
  scene.add(gripL);

  wristPanel.position.set(-0.03, 0.05, -0.08);
  wristPanel.rotation.set(-0.9, 0.0, 0.0);
  gripL.add(wristPanel);

  drawWrist(null);

  function updateWristRay({ raycaster, tempMatrix, controller }) {
    wristPanel.visible = renderer.xr.isPresenting;
    if (!renderer.xr.isPresenting) return;

    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const hits = raycaster.intersectObject(wristPanel, true);
    wristHover = null;

    if (hits.length) {
      const btn = getWristButtonAtUV(hits[0].uv);
      if (btn) wristHover = btn;
    }

    drawWrist(wristHover?.id ?? null);
  }

  function handleWristClick() {
    if (!renderer.xr.isPresenting) return false;
    if (!wristHover) return false;
    doAction(wristHover.id);
    return true;
  }

  // ---------- World interaction (store kiosk buttons) ----------
  function handleWorldAction(actionId) {
    if (actionId === "STORE_OPEN") {
      state.menuVisible = true;
      panel.visible = true;
      return;
    }
    if (actionId === "BUY_CHIPS") {
      state.chips += 1000;
      return;
    }
    if (actionId === "RESET_CHIPS") {
      state.chips = 10000;
      return;
    }
  }

  return {
    setPhoneJoystick,
    handleWorldAction,
    updateWristRay,
    handleWristClick,
    update() {
      // Front menu: desktop/phone only
      if (renderer.xr.isPresenting) {
        panel.visible = false;
      } else {
        panel.visible = state.menuVisible;
      }

      if (state.menuVisible && !renderer.xr.isPresenting) {
        raycaster.setFromCamera(mouse, camera);
        hoveredBtn = null;
        const hits = raycaster.intersectObject(panel, true);
        if (hits.length) hoveredBtn = getButtonAtUV(hits[0].uv);
        draw(hoveredBtn?.id ?? null);
      } else {
        draw(null);
      }

      drawLeaderboard();
      animateLeaderboard();
    }
  };
    }
