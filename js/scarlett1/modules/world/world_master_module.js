// /js/scarlett1/modules/world/world_master_module.js
// WORLD MASTER MODULE (FULL) — Modular Forever
// Lobby shell + expanded pit + stairs + oval table + 6 seats + 4 bots
// Community cards + bot cards NON-grabbable
// Chips + dealer button GRABBABLE and registered

export function createWorldMasterModule() {
  let built = false;

  return {
    name: "world_master_module",

    onEnable(ctx) {
      if (built) return;
      built = true;

      const THREE = ctx.THREE;

      const CFG = {
        LOBBY_RADIUS: 12.5,
        LOBBY_WALL_H: 4.2,

        PIT_RADIUS: 6.35,
        PIT_DEPTH: 1.25,
        PIT_FLOOR_RADIUS: 5.35,

        TABLE_LEN: 3.15,
        TABLE_WID: 2.10,
        TABLE_H: 0.78,

        SEAT_COUNT: 6,
        BOT_COUNT: 4,

        COMMUNITY_CARD_H: 1.10,
        BOT_CARD_H: 2.05,

        CHIP_STACKS: 5,
        CHIP_STACK_SIZE: 12,
      };

      const matStd = (color, rough = 0.85, metal = 0.08) =>
        new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

      function ringLine(radius, y, color = 0x33ffff, seg = 128) {
        const pts = [];
        for (let i = 0; i <= seg; i++) {
          const t = (i / seg) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
      }

      const root = ctx.scene;

      // LOBBY
      const lobbyFloor = new THREE.Mesh(
        new THREE.CircleGeometry(CFG.LOBBY_RADIUS, 96),
        matStd(0x08080d, 0.95, 0.02)
      );
      lobbyFloor.rotation.x = -Math.PI / 2;
      root.add(lobbyFloor);

      const lobbyWall = new THREE.Mesh(
        new THREE.CylinderGeometry(CFG.LOBBY_RADIUS, CFG.LOBBY_RADIUS, CFG.LOBBY_WALL_H, 128, 1, true),
        matStd(0x0b0b12, 0.85, 0.08)
      );
      lobbyWall.position.y = CFG.LOBBY_WALL_H * 0.5;
      root.add(lobbyWall);

      root.add(ringLine(CFG.LOBBY_RADIUS - 0.15, 0.03, 0x33ffff));
      root.add(ringLine(CFG.LOBBY_RADIUS - 0.25, 1.80, 0xff66ff));
      root.add(ringLine(CFG.LOBBY_RADIUS - 0.35, CFG.LOBBY_WALL_H - 0.35, 0x66aaff));

      // PIT
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

      root.add(ringLine(CFG.PIT_RADIUS - 0.12, 0.05, 0x33ffcc));

      // stairs
      const stairs = new THREE.Group();
      const steps = 10;
      const stairW = 2.2;
      const stairD = 0.34;
      const stairH = CFG.PIT_DEPTH / steps;
      for (let i = 0; i < steps; i++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(stairW, stairH * 0.9, stairD),
          matStd(0x0b0b12, 0.9, 0.08)
        );
        step.position.set(0, 0 - stairH * (i + 0.5), (CFG.PIT_RADIUS - stairD * 0.5) - stairD * i);
        stairs.add(step);
      }
      root.add(stairs);

      // TABLE GROUP
      const tableGroup = new THREE.Group();
      tableGroup.position.set(0, pitFloorY, 0);
      root.add(tableGroup);

      const tableTop = new THREE.Mesh(
        new THREE.CapsuleGeometry(CFG.TABLE_WID * 0.5, CFG.TABLE_LEN - CFG.TABLE_WID, 10, 32),
        new THREE.MeshStandardMaterial({ color: 0x0b1b14, roughness: 0.95, metalness: 0.05 })
      );
      tableTop.rotation.x = Math.PI / 2;
      tableTop.position.y = CFG.TABLE_H;
      tableGroup.add(tableTop);

      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(Math.max(CFG.TABLE_LEN, CFG.TABLE_WID) * 0.52 + 0.22, 0.07, 18, 96),
        matStd(0x151520, 0.75, 0.15)
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.y = CFG.TABLE_H + 0.07;
      tableGroup.add(rail);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, CFG.TABLE_H, 32),
        matStd(0x0b0b12, 0.85, 0.12)
      );
      base.position.y = CFG.TABLE_H * 0.5;
      tableGroup.add(base);

      // SEATS
      const seats = [];
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

        seats.push({ x, z, yaw });
      }

      // BOTS (show)
      const bots = [];
      for (let i = 0; i < CFG.BOT_COUNT; i++) {
        const s = seats[i % seats.length];
        const bot = new THREE.Group();

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

        const handL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), matStd(0x33ffff, 0.35, 0.18));
        const handR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), matStd(0xff66ff, 0.35, 0.18));
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

      // COMMUNITY CARDS (NON-GRABBABLE)
      const communityCards = [];
      const cardGeo = new THREE.PlaneGeometry(0.12, 0.18);
      const commMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide,
      });
      const commY = CFG.TABLE_H + CFG.COMMUNITY_CARD_H;
      const spread = 0.16;

      for (let i = 0; i < 5; i++) {
        const c = new THREE.Mesh(cardGeo, commMat.clone());
        c.position.set((i - 2) * spread, commY, 0);
        c.rotation.x = -Math.PI / 2;
        c.userData = { grabbable: false, type: "communityCard" };
        tableGroup.add(c);
        communityCards.push(c);
      }

      // BOT HOVER CARDS (NON-GRABBABLE) — stay readable
      const botHoverCards = [];
      const botMat = new THREE.MeshStandardMaterial({
        color: 0xddddff, roughness: 0.65, metalness: 0.0, side: THREE.DoubleSide,
      });

      for (let b = 0; b < bots.length; b++) {
        for (let k = 0; k < 2; k++) {
          const c = new THREE.Mesh(cardGeo, botMat.clone());
          c.userData = { grabbable: false, type: "botCard", _bot: b, _slot: k };
          root.add(c);
          botHoverCards.push(c);
        }
      }

      // CHIPS (GRABBABLE)
      const chips = [];
      const colors = [0xffffff, 0xff3355, 0x33ff88, 0x66aaff, 0xffcc33];
      const chipGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.012, 28);
      const tableY = CFG.TABLE_H + 0.02;

      for (let s = 0; s < CFG.CHIP_STACKS; s++) {
        for (let i = 0; i < CFG.CHIP_STACK_SIZE; i++) {
          const chip = new THREE.Mesh(
            chipGeo,
            new THREE.MeshStandardMaterial({ color: colors[s], roughness: 0.4, metalness: 0.15 })
          );
          chip.position.set(-0.45 + s * 0.12, tableY + i * 0.0122, 0.55);
          chip.userData = { grabbable: true, type: "chip" };
          tableGroup.add(chip);
          chips.push(chip);
          ctx.registerInteractable(chip);
        }
      }

      // DEALER BUTTON (GRABBABLE)
      const dealerButton = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.01, 32),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1, emissive: 0x111111, emissiveIntensity: 0.15 })
      );
      dealerButton.position.set(0, tableY + 0.006, -0.35);
      dealerButton.userData = { grabbable: true, type: "dealerButton" };
      tableGroup.add(dealerButton);
      ctx.registerInteractable(dealerButton);

      // Hover updater (keeps bot cards above heads)
      function updateHoverCards() {
        for (let b = 0; b < bots.length; b++) {
          const bot = bots[b];
          const headWorld = new THREE.Vector3();
          bot.getWorldPosition(headWorld);
          headWorld.y += CFG.BOT_CARD_H;

          const q = new THREE.Quaternion();
          bot.getWorldQuaternion(q);

          const left = new THREE.Vector3(-0.08, 0, 0).applyQuaternion(q);
          const right = new THREE.Vector3(0.08, 0, 0).applyQuaternion(q);

          let c0 = null, c1 = null;
          for (const c of botHoverCards) {
            if (c.userData._bot === b && c.userData._slot === 0) c0 = c;
            if (c.userData._bot === b && c.userData._slot === 1) c1 = c;
          }

          if (c0) { c0.position.copy(headWorld).add(left); c0.lookAt(0, headWorld.y, 0); }
          if (c1) { c1.position.copy(headWorld).add(right); c1.lookAt(0, headWorld.y, 0); }
        }
      }

      ctx.registerWorldUpdater((dt) => {
        // bot hand bob (simple show animation)
        for (const b of bots) {
          b.userData.phase += dt * 1.2;
          const p = b.userData.phase;
          b.userData.handL.position.y = 1.10 + Math.sin(p) * 0.02;
          b.userData.handR.position.y = 1.10 + Math.cos(p) * 0.02;
        }
        updateHoverCards();
      });

      ctx._show = {
        tableGroup,
        pitFloorY,
        seats,
        bots,
        chips,
        dealerButton,
        communityCards,
        botHoverCards,
      };

      console.log("[world_master_module] build done ✅ interactables=", ctx.interactables.length);
    },
  };
    }
