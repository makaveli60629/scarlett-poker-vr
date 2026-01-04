import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function initUI({ scene, camera, renderer, world, playerGroup }) {
  // ---------------- Desktop/Phone Menu Panel (in front of camera) ----------------
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

  let menuVisible = true;
  const buttons = [
    { id: "Lobby", label: "Teleport to Lobby" },
    { id: "PokerRoom", label: "Teleport to Poker Room" },
    { id: "Store", label: "Teleport to Store" },
    { id: "Reset", label: "Reset Position" }
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
    if (id === "Reset") playerGroup.position.set(0, 0, 5);
  }

  // ---------------- Phone joystick HUD (2D overlay) ----------------
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

  // ---------------- Draw menu panel ----------------
  function draw(activeId = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(10,12,18,0.80)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 42px Arial";
    ctx.fillText("Scarlett Poker VR", 40, 70);

    const x = 40, w = 600, h = 68;
    let y = 140;

    for (const b of buttons) {
      const isActive = activeId === b.id;
      ctx.fillStyle = isActive ? "rgba(90,160,255,0.92)" : "rgba(255,255,255,0.10)";
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold 30px Arial";
      ctx.fillText(b.label, x + 18, y + 46);
      y += 82;
    }

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "22px Arial";
    ctx.fillText("Press M to toggle menu (desktop)", 40, 485);

    tex.needsUpdate = true;
  }

  draw();

  // Desktop hover/click interaction
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredBtn = null;

  function getButtonAtUV(uv) {
    const px = uv.x * canvas.width;
    const py = (1 - uv.y) * canvas.height;

    const bx = 40, bw = 600, bh = 68, by0 = 140, step = 82;
    if (px < bx || px > bx + bw) return null;

    for (let i = 0; i < buttons.length; i++) {
      const by = by0 + i * step;
      if (py >= by && py <= by + bh) return buttons[i];
    }
    return null;
  }

  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "m") {
      menuVisible = !menuVisible;
      panel.visible = menuVisible;
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

  // ---------------- VR Wrist Menu (Watch Menu) ----------------
  // We attach a small canvas panel to the left controller grip.
  const wristCanvas = document.createElement("canvas");
  wristCanvas.width = 512;
  wristCanvas.height = 512;
  const wctx = wristCanvas.getContext("2d");
  const wristTex = new THREE.CanvasTexture(wristCanvas);

  const wristPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.18),
    new THREE.MeshBasicMaterial({ map: wristTex, transparent: true })
  );
  wristPanel.visible = false; // only show in VR

  const wristButtons = [
    { id: "Lobby", label: "Lobby" },
    { id: "PokerRoom", label: "Poker" },
    { id: "Store", label: "Store" },
    { id: "Reset", label: "Reset" }
  ];

  function drawWrist(activeId = null) {
    wctx.clearRect(0, 0, 512, 512);
    wctx.fillStyle = "rgba(0,0,0,0.55)";
    wctx.fillRect(0, 0, 512, 512);

    wctx.fillStyle = "rgba(255,255,255,0.9)";
    wctx.font = "bold 44px Arial";
    wctx.fillText("MENU", 160, 60);

    let y = 120;
    for (const b of wristButtons) {
      const isA = b.id === activeId;
      wctx.fillStyle = isA ? "rgba(90,160,255,0.95)" : "rgba(255,255,255,0.15)";
      wctx.fillRect(70, y, 372, 80);

      wctx.fillStyle = "rgba(255,255,255,0.92)";
      wctx.font = "bold 42px Arial";
      wctx.fillText(b.label, 120, y + 55);
      y += 95;
    }

    wristTex.needsUpdate = true;
  }

  drawWrist();

  const gripL = renderer.xr.getControllerGrip(0);
  scene.add(gripL);

  // Place it like a “watch”: rotated up toward your eyes
  wristPanel.position.set(-0.03, 0.05, -0.08);
  wristPanel.rotation.set(-0.9, 0.0, 0.0);
  gripL.add(wristPanel);

  // VR ray to click wrist menu
  let wristHover = null;

  function getWristButtonAtUV(uv) {
    const px = uv.x * 512;
    const py = (1 - uv.y) * 512;

    // button boxes: x 70..442, y starts 120 with step 95, height 80
    if (px < 70 || px > 442) return null;
    for (let i = 0; i < wristButtons.length; i++) {
      const y0 = 120 + i * 95;
      if (py >= y0 && py <= y0 + 80) return wristButtons[i];
    }
    return null;
  }

  function updateWristRay({ raycaster, tempMatrix, controller }) {
    // only while in XR
    wristPanel.visible = renderer.xr.isPresenting;
    if (!renderer.xr.isPresenting) return;

    // aim ray from controller
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

  // Clicking in VR: use selectstart on controller 0
  const ctrl0 = renderer.xr.getController(0);
  ctrl0.addEventListener("selectstart", () => {
    if (!renderer.xr.isPresenting) return;
    if (!wristHover) return;
    handleAction(wristHover.id);
  });

  return {
    setPhoneJoystick,
    updateWristRay,
    update() {
      // desktop hover only
      if (menuVisible && !renderer.xr.isPresenting) {
        raycaster.setFromCamera(mouse, camera);
        hoveredBtn = null;
        const hits = raycaster.intersectObject(panel, true);
        if (hits.length) hoveredBtn = getButtonAtUV(hits[0].uv);
        draw(hoveredBtn?.id ?? null);
      }

      // hide front panel in VR (you’ll use the wrist)
      if (renderer.xr.isPresenting) {
        panel.visible = false;
      } else {
        panel.visible = menuVisible;
      }
    }
  };
}
