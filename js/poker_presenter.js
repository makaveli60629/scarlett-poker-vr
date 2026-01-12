// /js/poker_presenter.js — Visual presenter for poker state (FULL)

import { faceCameraYawOnly, makeNameTag } from "./billboards.js";

export function createPokerPresenter() {
  const api = {
    init(ctx) {
      api.ctx = ctx;
      api.root = new ctx.THREE.Group();
      api.root.name = "PokerPresenter";
      ctx.scene.add(api.root);

      api.state = {
        seats: [],
        community: [],
        communityCount: 0,
        dealerIndex: 0,
        turnIndex: 0,
        turnText: "WAITING",
        potText: "POT: 0",
      };

      api._buildTableVisuals();
      ctx.log && ctx.log("[world] poker presenter ✅");
    },

    // Call this from your PokerSim events:
    // onHandStart({ dealerIndex })
    // onCommunity(count 3/4/5)
    // onTurn({ idx, action, amount })
    // onShowdown({ winnerName })
    onHandStart({ dealerIndex = 0 } = {}) {
      api.state.communityCount = 0;
      api.state.dealerIndex = dealerIndex;
      api._setDealerButton(dealerIndex);
      api._setCommunityVisible(0);
      api._setTurnHUD(-1, "NEW HAND", "");
    },

    onCommunity(count) {
      // ✅ hard rule: only allow 3,4,5
      const allowed = (count === 3 || count === 4 || count === 5);
      api.state.communityCount = allowed ? count : api.state.communityCount;
      api._setCommunityVisible(api.state.communityCount);
    },

    onTurn({ idx = 0, action = "CHECK", amount = "" } = {}) {
      api._setTurnHUD(idx, action, amount);
    },

    onPot(amount = 0) {
      api.potCanvas.ctx.clearRect(0, 0, 512, 256);
      api._drawHudBox(api.potCanvas.ctx, `POT: ${amount}`);
      api.potTex.needsUpdate = true;
    },

    // Call every frame
    update(dt) {
      const { camera } = api.ctx;

      // face all billboards yaw-only (no tilt)
      for (const s of api.state.seats) {
        faceCameraYawOnly(s.tag, camera);
        faceCameraYawOnly(s.turnHud, camera);
        // hole card HUD (high above head)
        faceCameraYawOnly(s.holeHud, camera);
      }
      faceCameraYawOnly(api.communityGroup, camera);
      faceCameraYawOnly(api.potHud, camera);
    }
  };

  api._drawHudBox = (ctx2d, text, sub = "") => {
    ctx2d.fillStyle = "rgba(10,12,18,0.78)";
    ctx2d.fillRect(0, 0, 512, 256);
    ctx2d.strokeStyle = "rgba(255,45,122,0.45)";
    ctx2d.lineWidth = 6;
    ctx2d.strokeRect(10, 10, 492, 236);

    ctx2d.fillStyle = "rgba(232,236,255,0.95)";
    ctx2d.font = "bold 60px system-ui, Arial";
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    ctx2d.fillText(text, 256, 110);

    if (sub) {
      ctx2d.font = "bold 44px system-ui, Arial";
      ctx2d.fillStyle = "rgba(127,231,255,0.95)";
      ctx2d.fillText(sub, 256, 190);
    }
  };

  api._buildTableVisuals = () => {
    const { THREE } = api.ctx;

    // Community cards group (faces camera, hovers higher)
    api.communityGroup = new THREE.Group();
    api.communityGroup.name = "CommunityCards";
    api.communityGroup.position.set(0, -0.25, 0.0); // relative to table anchor later
    api.root.add(api.communityGroup);

    // Build 5 simple visible cards (no ?)
    api.community = [];
    for (let i = 0; i < 5; i++) {
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(0.75, 1.05),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.05 })
      );
      card.position.set((i - 2) * 0.92, 2.35, 0);  // ✅ higher hover
      card.rotation.x = 0; // billboard handles yaw
      card.visible = false;
      card.name = `Community_${i}`;
      api.communityGroup.add(card);
      api.community.push(card);
    }

    // Pot HUD (always visible, straight)
    api.potHud = api._makeHudPlane("POT: 0", "");
    api.potHud.position.set(0, 2.05, -1.9);
    api.root.add(api.potHud);

    // turn HUD is per seat (built later per seat)
  };

  api._makeHudPlane = (t, sub) => {
    const { THREE } = api.ctx;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx2d = canvas.getContext("2d");

    api._drawHudBox(ctx2d, t, sub);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.PlaneGeometry(1.9, 0.95);
    const mesh = new THREE.Mesh(geo, mat);

    mesh.userData.canvas = canvas;
    mesh.userData.ctx2d = ctx2d;
    mesh.userData.tex = tex;
    mesh.userData.isBillboard = true;
    return mesh;
  };

  api._setCommunityVisible = (count) => {
    for (let i = 0; i < 5; i++) api.community[i].visible = (i < count);
  };

  api._setDealerButton = (dealerIndex) => {
    for (let i = 0; i < api.state.seats.length; i++) {
      api.state.seats[i].dealerBtn.visible = (i === dealerIndex);
    }
  };

  api._setTurnHUD = (idx, action, amount) => {
    for (let i = 0; i < api.state.seats.length; i++) {
      const seat = api.state.seats[i];
      const isTurn = (i === idx);
      seat.turnHud.visible = isTurn;
      if (isTurn) {
        const ctx2d = seat.turnHud.userData.ctx2d;
        api._drawHudBox(ctx2d, `TURN: BOT ${i + 1}`, `${action}${amount ? " " + amount : ""}`);
        seat.turnHud.userData.tex.needsUpdate = true;
      }
    }
  };

  // Called from world after seats/bots created
  api.attachToTable = ({ tableAnchor, seatAnchors, botNames = [] }) => {
    const { THREE } = api.ctx;

    // attach presenter root to table anchor (so pit depth moves everything correctly)
    tableAnchor.add(api.root);
    api.root.position.set(0, 0, 0);

    // seats
    api.state.seats = [];
    for (let i = 0; i < seatAnchors.length; i++) {
      const seatRoot = new THREE.Group();
      seatRoot.name = `SeatUI_${i}`;
      seatAnchors[i].add(seatRoot);

      const tag = makeNameTag({ THREE, text: botNames[i] || `BOT ${i + 1}` });
      tag.position.set(0, 2.15, 0);          // ✅ higher than head
      seatRoot.add(tag);

      // Hole cards HUD (high above head)
      const holeHud = api._makeHudPlane(`HOLE: BOT ${i + 1}`, "A♠ K♠"); // placeholder; you’ll feed real text if wanted
      holeHud.position.set(0, 3.05, 0);     // ✅ way higher
      seatRoot.add(holeHud);

      // Turn HUD (straight, appears only for active turn)
      const turnHud = api._makeHudPlane("TURN", "CHECK");
      turnHud.position.set(0, 2.65, 0.55);
      turnHud.visible = false;
      seatRoot.add(turnHud);

      // Dealer button (simple disk)
      const dealerBtn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.05, 24),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.6, metalness: 0.2 })
      );
      dealerBtn.rotation.x = Math.PI / 2;
      dealerBtn.position.set(0.55, 1.10, 0.35);
      dealerBtn.visible = false;
      seatRoot.add(dealerBtn);

      // Chip stack (just visual)
      const chips = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.22, 20),
        new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.6, metalness: 0.2 })
      );
      chips.position.set(-0.55, 1.05, 0.25);
      seatRoot.add(chips);

      api.state.seats.push({ tag, holeHud, turnHud, dealerBtn, chips });
    }
  };

  return api;
}
