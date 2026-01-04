import * as THREE from "three";

/**
 * UI
 * - Wrist/hover menu panel (attached in front of camera)
 * - Buttons: Lobby, PokerRoom, Reset, Toggle Leaderboard, Chips, Store
 * - Hovering leaderboard that reacts to pointer ray
 */
export function initUI({ scene, camera, renderer, world, playerGroup }) {
  const uiGroup = new THREE.Group();
  scene.add(uiGroup);

  // Canvas panel
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
  panel.visible = true;
  camera.add(panel);

  // Leaderboard (floating in space)
  const lbCanvas = document.createElement("canvas");
  lbCanvas.width = 512;
  lbCanvas.height = 512;
  const lbCtx = lbCanvas.getContext("2d");
  const lbTex = new THREE.CanvasTexture(lbCanvas);

  const leaderboard = new THREE.Mesh(
    new THREE.PlaneGeometry(0.75, 0.75),
    new THREE.MeshBasicMaterial({ map: lbTex, transparent: true })
  );
  leaderboard.position.set(3.2, 1.6, 0); // near lobby
  scene.add(leaderboard);

  let leaderboardVisible = true;
  const buttons = [
    { id: "Lobby", label: "Teleport: Lobby" },
    { id: "PokerRoom", label: "Teleport: Poker Room" },
    { id: "Reset", label: "Reset Position" },
    { id: "LB", label: "Toggle Leaderboard" },
    { id: "Chips", label: "Real Chips Button" },
    { id: "Store", label: "Store Kiosk" }
  ];

  // UI hit mapping (simple screen-space coords)
  function drawPanel(activeId = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background
    ctx.fillStyle = "rgba(10,12,18,0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 42px Arial";
    ctx.fillText("Scarlett Poker VR", 40, 70);

    ctx.font = "26px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("Menu (hover + click)", 40, 112);

    // buttons
    const x = 40, w = 450, h = 62;
    let y = 150;

    for (const b of buttons) {
      const isActive = activeId === b.id;
      ctx.fillStyle = isActive ? "rgba(90,160,255,0.9)" : "rgba(255,255,255,0.12)";
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold 28px Arial";
      ctx.fillText(b.label, x + 18, y + 42);

      y += 72;
    }

    // help
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "22px Arial";
    ctx.fillText("Keys: M = toggle menu, L = Lobby, P = Poker Room", 40, 485);

    tex.needsUpdate = true;
  }

  function drawLeaderboard(hoverRow = -1) {
    lbCtx.clearRect(0, 0, lbCanvas.width, lbCanvas.height);
    lbCtx.fillStyle = "rgba(10,12,18,0.80)";
    lbCtx.fillRect(0, 0, lbCanvas.width, lbCanvas.height);

    lbCtx.fillStyle = "rgba(255,255,255,0.92)";
    lbCtx.font = "bold 34px Arial";
    lbCtx.fillText("Leaderboard", 28, 54);

    const rows = [
      ["1", "NovaDealer", "10,000"],
      ["2", "Blue", "8,250"],
      ["3", "Scarlett", "7,100"],
      ["4", "PlayerBot_A", "6,900"],
      ["5", "PlayerBot_B", "6,450"]
    ];

    lbCtx.font = "28px Arial";
    let y = 110;
    for (let i = 0; i < rows.length; i++) {
      const isHover = i === hoverRow;
      lbCtx.fillStyle = isHover ? "rgba(90,160,255,0.45)" : "rgba(255,255,255,0.10)";
      lbCtx.fillRect(20, y - 34, 472, 46);

      lbCtx.fillStyle = "rgba(255,255,255,0.92)";
      lbCtx.fillText(`${rows[i][0]}. ${rows[i][1]}`, 34, y);
      lbCtx.fillStyle = "rgba(255,255,255,0.75)";
      lbCtx.fillText(rows[i][2], 360, y);

      y += 62;
    }

    lbTex.needsUpdate = true;
  }

  drawPanel();
  drawLeaderboard();

  // Hover + click ray
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  let menuVisible = true;
  let hoveredBtn = null;
  let hoveredLBRow = -1;

  function setMenuVisible(v) {
    menuVisible = v;
    panel.visible = v;
  }

  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "m") setMenuVisible(!menuVisible);
  });

  function getMenuButtonAtUV(uv) {
    // our button column is x=40..490, y starts 150, step 72, height 62
    const x = uv.x * canvas.width;
    const y = (1 - uv.y) * canvas.height;

    const bx = 40, bw = 450, bh = 62, by0 = 150, step = 72;

    if (x < bx || x > bx + bw) return null;

    for (let i = 0; i < buttons.length; i++) {
      const by = by0 + i * step;
      if (y >= by && y <= by + bh) return buttons[i];
    }
    return null;
  }

  function getLeaderboardRowAtUV(uv) {
    const y = (1 - uv.y) * lbCanvas.height;
    // rows drawn starting ~110 with spacing 62, row band height ~46
    const start = 110;
    const step = 62;
    for (let i = 0; i < 5; i++) {
      const ry = start + i * step;
      const top = ry - 34;
      const bot = top + 46;
      if (y >= top && y <= bot) return i;
    }
    return -1;
  }

  function teleportTo(label) {
    const t = world.markers?.[label];
    if (!t) return;
    playerGroup.position.set(t.x, 0, t.z);
  }

  function handleAction(id) {
    if (id === "Lobby") teleportTo("Lobby");
    if (id === "PokerRoom") teleportTo("PokerRoom");
    if (id === "Reset") playerGroup.position.set(0, 0, 5);
    if (id === "LB") {
      leaderboardVisible = !leaderboardVisible;
      leaderboard.visible = leaderboardVisible;
    }
    if (id === "Chips") {
      // placeholder hook: this is where your “real chips button” logic goes later
      console.log("Real Chips Button pressed (placeholder)");
    }
    if (id === "Store") {
      console.log("Store Kiosk opened (placeholder)");
    }
  }

  // mouse hover/click for desktop (VR hover is handled in main loop via controller ray in later pass)
  window.addEventListener("pointermove", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  });

  window.addEventListener("click", () => {
    if (hoveredBtn) handleAction(hoveredBtn.id);
  });

  return {
    panel,
    leaderboard,
    setMenuVisible,
    update() {
      // ray from camera through mouse (desktop)
      raycaster.setFromCamera(mouse, camera);

      hoveredBtn = null;
      hoveredLBRow = -1;

      if (menuVisible) {
        const menuHits = raycaster.intersectObject(panel, true);
        if (menuHits.length) {
          const uv = menuHits[0].uv;
          const btn = getMenuButtonAtUV(uv);
          hoveredBtn = btn;
        }
      }

      if (leaderboardVisible) {
        const lbHits = raycaster.intersectObject(leaderboard, true);
        if (lbHits.length) {
          const uv = lbHits[0].uv;
          hoveredLBRow = getLeaderboardRowAtUV(uv);
        }
      }

      drawPanel(hoveredBtn?.id ?? null);
      drawLeaderboard(hoveredLBRow);
    }
  };
}
