// /js/scarlett1/modules/world/world_master_module.js
// WORLD MASTER MODULE (FULL) — Modular Forever
// - Builds lobby shell + expanded pit + stairs
// - Builds oval table + 6 seats
// - Spawns 4 show-bots seated
// - Community cards hover (NON-GRABBABLE)
// - Bot hover cards hover (NON-GRABBABLE)
// - Chips + dealer button are GRABBABLE and registered as interactables
// - Exposes ctx._show for showgame module

export function createWorldMasterModule() {
  let built = false;

  return {
    name: "world_master_module",

    onEnable(ctx) {
      if (built) return;
      built = true;

      const THREE = ctx.THREE;

      // ---------- CONFIG ----------
      const CFG = {
        // Lobby
        LOBBY_RADIUS: 12.5,
        LOBBY_WALL_H: 4.2,

        // Pit (expanded!)
        PIT_RADIUS: 6.35,
        PIT_DEPTH: 1.25,
        PIT_FLOOR_RADIUS: 5.35,

        // Table (oval)
        TABLE_LEN: 3.15,
        TABLE_WID: 2.10,
        TABLE_H: 0.78,

        // Seating / bots
        SEAT_COUNT: 6,
        BOT_COUNT: 4,

        // Cards
        COMMUNITY_CARD_H: 1.10,
        BOT_CARD_H: 2.05,

        // Chips
        CHIP_STACKS: 5,
        CHIP_STACK_SIZE: 12,
      };

      const matStd = (color, rough = 0.85, metal = 0.08) =>
        new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

      const matEmissive = (color, emissive, ei = 0.4, rough = 0.65, metal = 0.1) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: rough,
          metalness: metal,
          emissive: new THREE.Color(emissive),
          emissiveIntensity: ei,
        });

      function ringLine(radius, y, color = 0x33ffff, seg = 128) {
        const pts = [];
        for (let i = 0; i <= seg; i++) {
          const t = (i / seg) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
      }

      // ---------- BUILD TARGET ROOT ----------
      // If Room Manager exists, build “main test world” inside Room #1.
      // Otherwise build at scene root.
      let root = ctx.scene;
      let roomGroup = null;

      if (ctx.rooms?.ensure) {
        const rooms = ctx.rooms.ensure(1);
        roomGroup = rooms?.[0]?.group || ctx.rooms.get?.(0)?.group || null;
        if (roomGroup) root = roomGroup;
      }

      // ---------- LOBBY SHELL ----------
      // Floor
      const lobbyFloor = new THREE.Mesh(
        new THREE.CircleGeometry(CFG.LOBBY_RADIUS, 96),
        matStd(0x08080d, 0.95, 0.02)
      );
      lobbyFloor.rotation.x = -Math.PI / 2;
      lobbyFloor.position.y = 0.0;
      root.add(lobbyFloor);

      // Circular wall (sealed)
      const lobbyWall = new THREE.Mesh(
        new THREE.CylinderGeometry(CFG.LOBBY_RADIUS, CFG.LOBBY_RADIUS, CFG.LOBBY_WALL_H, 128, 1, true),
        matStd(0x0b0b12, 0.85, 0.08)
      );
      lobbyWall.position.y = CFG.LOBBY_WALL_H * 0.5;
      root.add(lobbyWall);

      // Accent rings (no poles, no table ring nonsense)
      root.add(ringLine(CFG.LOBBY_RADIUS - 0.15, 0.03, 0x33ffff));
      root.add(ringLine(CFG.LOBBY_RADIUS - 0.25, 1.80, 0xff66ff));
      root.add(ringLine(CFG.LOBBY_RADIUS - 0.35, CFG.LOBBY_WALL_H - 0.35, 0x66aaff));

      // ---------- PIT / DIVOT ----------
      const pitFloorY = -CFG.PIT_DEPTH;

      const pitInnerFloor = new THREE.Mesh(
        new THREE.CircleGeometry(CFG.PIT_FLOOR_RADIUS, 96),
        matStd(0x06060b, 0.98, 0.02)
      );
      pitInnerFloor.rotation.x = -Math.PI / 2;
      pitInnerFloor.position.y = pitFloorY;
      root.add(pitInnerFloor);

      const pitWall = new THREE.Mesh(
        new THREE.CylinderGeometry(CFG.PIT_RADIUS, CFG.PIT_FLOOR_RADIUS, CFG.PIT_DEPTH, 128, 1, true),
        matStd(0x05050a, 0.92, 0.06)
      );
      pitWall.position.y = pitFloorY + CFG.PIT_DEPTH * 0.5;
      root.add(pitWall);

      // Pit rim trim
      root.add(ringLine(CFG.PIT_RADIUS - 0.12, 0.05, 0x33ffcc));

      // Stairs spanning the pit descent
      const stairs = new THREE.Group();
      stairs.name = "PitStairs";
      const steps = 10;
      const stairW = 2.2;
      const stairD = 0.34;
      const stairH = CFG.PIT_DEPTH / steps;

      for (let i = 0; i < steps; i++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(stairW, stairH * 0.9, stairD),
          matStd(0x0b0b12, 0.9, 0.08)
        );
        step.position.set(
          0,
          0 - stairH * (i + 0.5),
          (CFG.PIT_RADIUS - stairD * 0.5) - stairD * i
        );
        stairs.add(step);
      }
      root.add(stairs);

      // ---------- TABLE GROUP (inside pit) ----------
      const tableGroup = new THREE.Group();
      tableGroup.name = "MainTableGroup";
      tableGroup.position.set(0, pitFloorY, 0);
      root.add(tableGroup);

      // Table top (capsule oval)
      const tableTop = new THREE.Mesh(
        new THREE.CapsuleGeometry(CFG.TABLE_WID * 0.5, CFG.TABLE_LEN - CFG.TABLE_WID, 10, 32),
        new THREE.MeshStandardMaterial({ color: 0x0b1b14, roughness: 0.95, metalness: 0.05 })
      );
      tableTop.rotation.x = Math.PI / 2;
      tableTop.position.y = CFG.TABLE_H;
      tableGroup.add(tableTop);

      // Rail guard (NO poles)
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(Math.max(CFG.TABLE_LEN, CFG.TABLE_WID) * 0.52 + 0.22, 0.07, 18, 96),
        matStd(0x151520, 0.75, 0.15)
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.y = CFG.TABLE_H + 0.07;
      tableGroup.add(rail);

      // Base
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, CFG.TABLE_H, 32),
        matStd(0x0b0b12, 0.85, 0.12)
      );
      base.position.y = CFG.TABLE_H * 0.5;
      tableGroup.add(base);

      // ---------- SEATS ----------
      const seats = [];
      const chairs = [];
      const seatRadius = Math.max(CFG.TABLE_LEN, CFG.TABLE_WID) * 0.52 + 0.95;

      for (let i = 0; i < CFG.SEAT_COUNT; i++) {
        const t = (i / CFG.SEAT_COUNT) * Math.PI * 2;
        const x = Math.cos(t) * seatRadius;
        const z = Math.sin(t) * seatRadius;
        const yaw = -t + Math.PI / 2;

        const chair = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.8, 0.55),
          matStd(0x12121b, 0.9, 0.08)
        );
        chair.position.set(x, 0.4, z);
        chair.rotation.y = yaw;
        tableGroup.add(chair);
        chairs.push(chair);

        seats.push({ x, z, yaw });
      }

      // ---------- SHOW BOTS (lightweight) ----------
      const bots = [];
      for (let i = 0; i < CFG.BOT_COUNT; i++) {
        const s = seats[i % seats.length];

        const bot = new THREE.Group();
        bot.name = `ShowBot_${i}`;

        const torso = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.18, 0.55, 6, 18),
          matStd(0x1a1a26, 0.8, 0.08)
        );
        torso.position.y = 1.05;
        bot.add(torso);

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 18, 18),
          matStd(0x26263a, 0.7, 0.12)
        );
        head.position.y = 1.55;
        bot.add(head);

        // hand markers for show animation
        const handL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), matEmissive(0x33ffff, 0x112233, 0.5));
        const handR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), matEmissive(0xff66ff, 0x221133, 0.5));
        handL.position.set(-0.22, 1.12, 0.18);
        handR.position.set(0.22, 1.12, 0.18);
        bot.add(handL);
        bot.add(handR);

        bot.userData.handL = handL;
        bot.userData.handR = handR;
        bot.userData.phase = Math.random() * Math.PI * 2;

        bot.position.set(s.x, 0, s.z);
        bot.rotation.y = s.yaw;
        tableGroup.add(bot);
        bots.push(bot);
      }

      // ---------- COMMUNITY CARDS (NON-GRABBABLE) ----------
      const communityCards = [];
      const cardGeo = new THREE.PlaneGeometry(0.12, 0.18);
      const commMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.6,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });

      const commY = CFG.TABLE_H + CFG.COMMUNITY_CARD_H;
      const commSpread = 0.16;

      for (let i = 0; i < 5; i++) {
        const c = new THREE.Mesh(cardGeo, commMat.clone());
        c.position.set((i - 2) * commSpread, commY, 0.0);
        c.rotation.x = -Math.PI / 2;

        c.userData = { grabbable: false, type: "communityCard" };
        tableGroup.add(c);
        communityCards.push(c);
      }

      // ---------- BOT HOVER CARDS (NON-GRABBABLE) ----------
      // These live in world space so they always stay readable.
      const botHoverCards = [];
      const botCardMat = new THREE.MeshStandardMaterial({
        color: 0xddddff,
        roughness: 0.65,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });

      for (let b = 0; b < bots.length; b++) {
        for (let k = 0; k < 2; k++) {
          const c = new THREE.Mesh(cardGeo, botCardMat.clone());
          c.userData = { grabbable: false, type: "botCard", _bot: b, _slot: k };
          // Add to root (world space)
          root.add(c);
          botHoverCards.push(c);
        }
      }

      // Update hover cards each frame (cheap)
      ctx._show = ctx._show || {};
      ctx._show._hoverUpdate = (dt) => {
        for (let b = 0; b < bots.length; b++) {
          const bot = bots[b];
          const headWorld = new THREE.Vector3();
          bot.getWorldPosition(headWorld);
          headWorld.y += CFG.BOT_CARD_H;

          const q = new THREE.Quaternion();
          bot.getWorldQuaternion(q);

          const left = new THREE.Vector3(-0.08, 0, 0).applyQuaternion(q);
          const right = new THREE.Vector3(0.08, 0, 0).applyQuaternion(q);

          const c0 = botHoverCards.find(x => x.userData._bot === b && x.userData._slot === 0);
          const c1 = botHoverCards.find(x => x.userData._bot === b && x.userData._slot === 1);

          if (c0) { c0.position.copy(headWorld).add(left); c0.lookAt(0, headWorld.y, 0); }
          if (c1) { c1.position.copy(headWorld).add(right); c1.lookAt(0, headWorld.y, 0); }
        }
      };

      // Attach updater
      ctx.registerWorldUpdater = ctx.registerWorldUpdater || ((fn) => {
        // If your orchestrator doesn’t have a dedicated updater bus,
        // we use ctx._worldUpdaters and the orchestrator can call it later.
        ctx._worldUpdaters = ctx._worldUpdaters || [];
        ctx._worldUpdaters.push(fn);
      });

      ctx.registerWorldUpdater((dt) => {
        if (ctx._show?._hoverUpdate) ctx._show._hoverUpdate(dt);
      });

      // ---------- CHIPS (GRABBABLE) ----------
      const chips = [];
      const chipColors = [0xffffff, 0xff3355, 0x33ff88, 0x66aaff, 0xffcc33];
      const chipGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.012, 28);

      const tableY = CFG.TABLE_H + 0.02;

      for (let s = 0; s < CFG.CHIP_STACKS; s++) {
        for (let i = 0; i < CFG.CHIP_STACK_SIZE; i++) {
          const chip = new THREE.Mesh(
            chipGeo,
            new THREE.MeshStandardMaterial({ color: chipColors[s], roughness: 0.4, metalness: 0.15 })
          );

          chip.position.set(-0.45 + s * 0.12, tableY + i * 0.0122, 0.55);
          chip.userData = { grabbable: true, type: "chip" };

          tableGroup.add(chip);
          chips.push(chip);

          // Register as interactable (grab module uses ctx.interactables)
          ctx.registerInteractable?.(chip);
        }
      }

      // Dealer button (GRABBABLE + flat)
      const dealerButton = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.01, 32),
        matEmissive(0xffffff, 0x111111, 0.15, 0.4, 0.1)
      );
      dealerButton.position.set(0.0, tableY + 0.006, -0.35);
      dealerButton.userData = { grabbable: true, type: "dealerButton" };
      tableGroup.add(dealerButton);
      ctx.registerInteractable?.(dealerButton);

      // ---------- EXPOSE SHOW REFERENCES ----------
      // Other modules (bot_showgame_module) will animate these.
      ctx._show = {
        root,
        roomGroup,
        tableGroup,
        pitFloorY,
        seats,
        chairs,
        bots,
        chips,
        dealerButton,
        dealerIndex: 0,
        communityCards,
        botHoverCards,
      };

      console.log("[world_master_module] build done ✅",
        "room=", roomGroup ? roomGroup.name : "sceneRoot",
        "interactables=", ctx.interactables?.length ?? 0
      );
    },

    // Optional: if your orchestrator calls module.update, we can run the hover updates here too.
    update(ctx, { dt }) {
      // If you didn’t wire ctx._worldUpdaters, this keeps hover cards alive anyway.
      if (ctx._show?._hoverUpdate) ctx._show._hoverUpdate(dt);

      // If ctx._worldUpdaters exists, run them too (safe)
      if (ctx._worldUpdaters?.length) {
        for (const fn of ctx._worldUpdaters) fn(dt);
      }
    },
  };
          }
