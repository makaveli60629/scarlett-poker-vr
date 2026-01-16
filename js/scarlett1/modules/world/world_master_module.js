// /js/scarlett1/modules/world/world_master_module.js
// World module: builds geometry + registers interactables (chips etc)
// Does NOT handle XR input.

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

        PIT_RADIUS: 6.2,
        PIT_DEPTH: 1.2,
        PIT_FLOOR_RADIUS: 5.2,

        TABLE_LEN: 3.1,
        TABLE_WID: 2.05,
        TABLE_H: 0.78,

        BOT_CARD_H: 2.05,
        COMMUNITY_CARD_H: 1.10,
      };

      const mat = (color, rough=0.85, metal=0.08) =>
        new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

      const makeRing = (radius, y, color=0x33ffff, seg=128) => {
        const pts = [];
        for (let i=0;i<=seg;i++){
          const t = (i/seg)*Math.PI*2;
          pts.push(new THREE.Vector3(Math.cos(t)*radius, y, Math.sin(t)*radius));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
      };

      // ===== Lobby floor + wall (sealed)
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(CFG.LOBBY_RADIUS, 96),
        mat(0x08080d, 0.95, 0.02)
      );
      floor.rotation.x = -Math.PI/2;
      ctx.scene.add(floor);

      const wall = new THREE.Mesh(
        new THREE.CylinderGeometry(CFG.LOBBY_RADIUS, CFG.LOBBY_RADIUS, CFG.LOBBY_WALL_H, 128, 1, true),
        mat(0x0b0b12, 0.85, 0.08)
      );
      wall.position.y = CFG.LOBBY_WALL_H*0.5;
      ctx.scene.add(wall);

      ctx.scene.add(makeRing(CFG.LOBBY_RADIUS-0.35, CFG.LOBBY_WALL_H-0.25, 0x66aaff));

      // ===== Pit/divot expanded + stairs
      const pitFloorY = -CFG.PIT_DEPTH;

      const inner = new THREE.Mesh(
        new THREE.CircleGeometry(CFG.PIT_FLOOR_RADIUS, 96),
        mat(0x06060b, 0.98, 0.02)
      );
      inner.rotation.x = -Math.PI/2;
      inner.position.y = pitFloorY;
      ctx.scene.add(inner);

      const side = new THREE.Mesh(
        new THREE.CylinderGeometry(CFG.PIT_RADIUS, CFG.PIT_FLOOR_RADIUS, CFG.PIT_DEPTH, 128, 1, true),
        mat(0x05050a, 0.92, 0.06)
      );
      side.position.y = pitFloorY + CFG.PIT_DEPTH*0.5;
      ctx.scene.add(side);

      ctx.scene.add(makeRing(CFG.PIT_RADIUS, 0.02, 0x33ffcc));

      // stairs
      const stairs = new THREE.Group();
      const steps = 10;
      const stairW = 2.2, stairD = 0.34;
      const stairH = CFG.PIT_DEPTH/steps;
      for (let i=0;i<steps;i++){
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(stairW, stairH*0.9, stairD),
          mat(0x0b0b12, 0.9, 0.08)
        );
        step.position.set(0, (0 - stairH*(i+0.5)), (CFG.PIT_RADIUS - stairD*0.5) - stairD*i);
        stairs.add(step);
      }
      ctx.scene.add(stairs);

      // ===== Table group in pit
      const tableGroup = new THREE.Group();
      tableGroup.position.set(0, pitFloorY, 0);
      ctx.scene.add(tableGroup);

      const top = new THREE.Mesh(
        new THREE.CapsuleGeometry(CFG.TABLE_WID*0.5, CFG.TABLE_LEN - CFG.TABLE_WID, 10, 32),
        new THREE.MeshStandardMaterial({ color: 0x0b1b14, roughness: 0.95, metalness: 0.05 })
      );
      top.rotation.x = Math.PI/2;
      top.position.y = CFG.TABLE_H;
      tableGroup.add(top);

      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(Math.max(CFG.TABLE_LEN, CFG.TABLE_WID)*0.52 + 0.22, 0.07, 18, 96),
        new THREE.MeshStandardMaterial({ color: 0x151520, roughness: 0.75, metalness: 0.15 })
      );
      rail.rotation.x = Math.PI/2;
      rail.position.y = CFG.TABLE_H + 0.07;
      tableGroup.add(rail);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, CFG.TABLE_H, 32),
        mat(0x0b0b12, 0.85, 0.12)
      );
      base.position.y = CFG.TABLE_H*0.5;
      tableGroup.add(base);

      // chairs (6)
      const seats = [];
      const seatCount = 6;
      const seatRadius = Math.max(CFG.TABLE_LEN, CFG.TABLE_WID)*0.52 + 0.9;
      for (let i=0;i<seatCount;i++){
        const t = (i/seatCount)*Math.PI*2;
        const x = Math.cos(t)*seatRadius;
        const z = Math.sin(t)*seatRadius;

        const chair = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.8, 0.55),
          mat(0x12121b, 0.9, 0.08)
        );
        chair.position.set(x, 0.4, z);
        chair.rotation.y = -t + Math.PI/2;
        tableGroup.add(chair);

        seats.push({ x, z, yaw: -t + Math.PI/2 });
      }

      // ===== Community cards (hover, NON-grabbable)
      const cardGeo = new THREE.PlaneGeometry(0.12, 0.18);
      const commY = pitFloorY + CFG.TABLE_H + CFG.COMMUNITY_CARD_H;
      const spread = 0.16;
      for (let i=0;i<5;i++){
        const c = new THREE.Mesh(
          cardGeo,
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide })
        );
        c.position.set((i-2)*spread, commY, 0.0);
        c.rotation.x = -Math.PI/2;
        c.userData = { grabbable: false, type: "communityCard" };
        tableGroup.add(c);
      }

      // ===== Chips (flat stacked, GRABBABLE)
      const colors = [0xffffff, 0xff3355, 0x33ff88, 0x66aaff, 0xffcc33];
      const chipGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.012, 28);
      const chipBaseY = pitFloorY + CFG.TABLE_H + 0.02;

      for (let s=0;s<5;s++){
        for (let i=0;i<12;i++){
          const chip = new THREE.Mesh(
            chipGeo,
            new THREE.MeshStandardMaterial({ color: colors[s], roughness: 0.4, metalness: 0.15 })
          );
          chip.position.set(-0.45 + s*0.12, chipBaseY + i*0.0122, 0.55);
          chip.userData = { grabbable: true, type: "chip" };
          tableGroup.add(chip);
          ctx.registerInteractable(chip);
        }
      }

      // dealer button (grabbable)
      const dealer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.01, 32),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1, emissive: 0x111111, emissiveIntensity: 0.15 })
      );
      dealer.position.set(0.0, chipBaseY + 0.006, -0.35);
      dealer.userData = { grabbable: true, type: "dealerButton" };
      tableGroup.add(dealer);
      ctx.registerInteractable(dealer);

      // ===== Neon trims
      ctx.scene.add(makeRing(CFG.LOBBY_RADIUS-0.15, 0.03, 0x33ffff));
      ctx.scene.add(makeRing(CFG.LOBBY_RADIUS-0.25, 1.8, 0xff66ff));
      ctx.scene.add(makeRing(CFG.LOBBY_RADIUS-0.35, CFG.LOBBY_WALL_H-0.35, 0x66aaff));
      ctx.scene.add(makeRing(CFG.PIT_RADIUS-0.12, 0.05, 0x33ffcc));

      // ===== Jumbotrons (safe placeholders)
      const jumbo = new THREE.Group();
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x0f0f18, roughness: 0.65, metalness: 0.15,
        emissive: 0x111122, emissiveIntensity: 0.35
      });
      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x10102a, roughness: 0.35, metalness: 0.1,
        emissive: 0x2233aa, emissiveIntensity: 0.45
      });

      const r = CFG.LOBBY_RADIUS - 1.4;
      const y = 2.7;
      for (let i=0;i<4;i++){
        const t = (i/4)*Math.PI*2;
        const x = Math.cos(t)*r;
        const z = Math.sin(t)*r;

        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 0.2), panelMat);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), screenMat);

        frame.position.set(x, y, z);
        frame.rotation.y = -t + Math.PI/2;
        screen.position.set(0, 0, 0.101);
        frame.add(screen);

        jumbo.add(frame);
      }
      ctx.scene.add(jumbo);

      console.log("[world_master_module] build done ✅ interactables=", ctx.interactables.length);
    }
  };
}
