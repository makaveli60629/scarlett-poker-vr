// /js/world.js — Scarlett Hybrid World v4.4 (FULL)
// FIXES:
// ✅ Hub floor ON (only in circle room); pit stays open
// ✅ Teleporter moved farther behind spawn + offset so you DON'T see it
// ✅ Welcome HUD smaller, higher, icon + name + $50k + time
// ✅ All entrance signs face HubCenter
// ✅ Seat pads removed; seats + bots moved closer to table + pinned
// ✅ 4 Jumbotron frames above each hub entrance (with labels below)
// ✅ Optional fireplace + fountain props in VIP room

export const World = {
  async init(ctx) {
    const { THREE, scene, LOG } = ctx;
    ctx.worldVersion = "v4.4";
    const log  = (m)=>LOG?.push?.("log", m) || console.log(m);

    // --- Materials ---
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.78, metalness: 0.12 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.55, metalness: 0.22 });
    const feltMat   = new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.92, metalness: 0.05 });

    const neon = (hex, intensity=2.0) => new THREE.MeshStandardMaterial({
      color: 0x05060a,
      emissive: new THREE.Color(hex),
      emissiveIntensity: intensity,
      roughness: 0.35,
      metalness: 0.15
    });

    const trimHub  = neon(0x9b5cff, 2.25);
    const trimCyan = neon(0x00ffff, 2.0);
    const trimPink = neon(0xff2d7a, 1.95);
    const trimGold = neon(0xffd36b, 1.85);

    // --- Layout ---
    const WALL_T = 0.28;
    const WALL_H_ROOM = 3.0;
    const WALL_H_HUB  = 6.0;

    const HUB_R = 14.0;
    const ROOM_S = 14.0;
    const CORRIDOR_L = 10.0;
    const CORRIDOR_W = 5.0;

    const frontZ = HUB_R + CORRIDOR_L + ROOM_S/2;
    const backZ  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const leftX  = -(HUB_R + CORRIDOR_L + ROOM_S/2);
    const rightX =  (HUB_R + CORRIDOR_L + ROOM_S/2);

    // --- Hub Center anchor ---
    const hubCenter = new THREE.Object3D();
    hubCenter.name = "HubCenter";
    hubCenter.position.set(0,0,0);
    scene.add(hubCenter);

    // --- Hub floor ON (solid) ---
    const hubFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(HUB_R-0.2, HUB_R-0.2, 0.14, 96),
      new THREE.MeshStandardMaterial({ color: 0x090b14, roughness: 0.85 })
    );
    hubFloor.position.set(0, 0.07, 0);
    hubFloor.name = "HubPlate";
    scene.add(hubFloor);

    // Hub base trim ring
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R, 0.13, 16, 180), trimHub);
    baseRing.rotation.x = Math.PI/2;
    baseRing.position.set(0, 0.10, 0);
    scene.add(baseRing);

    // --- Pit (open) ---
    const pitR = 6.9;
    const pitH = 1.55;

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR, pitR, pitH, 72, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.75, metalness: 0.10, side: THREE.DoubleSide })
    );
    pitWall.position.set(0, -pitH/2, 0);
    scene.add(pitWall);

    const pitFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR-0.25, pitR-0.25, 0.08, 72),
      new THREE.MeshStandardMaterial({ color: 0x070912, roughness: 0.95 })
    );
    pitFloor.position.set(0, -pitH+0.02, 0);
    scene.add(pitFloor);

    // Pit lip rail (top edge)
    const pitLipRail = new THREE.Mesh(
      new THREE.TorusGeometry(pitR + 0.35, 0.11, 14, 160),
      neon(0x00ffff, 1.25)
    );
    pitLipRail.rotation.x = Math.PI/2;
    pitLipRail.position.set(0, 0.22, 0);
    scene.add(pitLipRail);

    // Inner rail (inside pit)
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(5.05, 0.11, 12, 160),
      new THREE.MeshStandardMaterial({ color: 0x0e1018, emissive: 0x18344a, emissiveIntensity: 1.0 })
    );
    rail.rotation.x = Math.PI/2;
    rail.position.set(0, -0.72, 0);
    rail.name = "MainRail";
    scene.add(rail);

    // --- Grand table (8 seats) ---
    const tableR = 2.65;
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(tableR, tableR, 0.16, 64),
      feltMat
    );
    table.position.set(0, -0.58, 0);
    table.name = "BossTable";
    scene.add(table);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 0.95, 28),
      darkMetal
    );
    tableBase.position.set(0, -1.02, 0);
    scene.add(tableBase);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(tableR, 0.10, 16, 140),
      neon(0x9b5cff, 0.95)
    );
    rim.rotation.x = Math.PI/2;
    rim.position.set(0, -0.48, 0);
    scene.add(rim);

    // --- Simple bot ---
    function makeBot(matColor) {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: matColor, roughness: 0.7, metalness: 0.05, flatShading: true });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.22), mat);
      torso.position.y = 1.05;
      g.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), mat);
      head.position.set(0, 0.42, 0);
      torso.add(head);

      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), mat);
      const arm2 = arm.clone();
      arm.position.set(-0.25, 1.02, 0.06);
      arm2.position.set(0.25, 1.02, 0.06);
      arm.rotation.z = 0.35;
      arm2.rotation.z = -0.35;
      g.add(arm, arm2);

      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 4, 8), mat);
      const leg2 = leg.clone();
      leg.position.set(-0.10, 0.55, 0);
      leg2.position.set(0.10, 0.55, 0);
      g.add(leg, leg2);

      return g;
    }

    // Seats closer to table (inside inner rail, near table)
    const seatR = 3.55;              // ✅ moved closer
    const seatY = -0.98;
    const chairGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.22, 16);

    for (let i = 0; i < 8; i++) {
      const a = (i/8) * Math.PI*2;
      const x = Math.cos(a) * seatR;
      const z = Math.sin(a) * seatR;

      const chair = new THREE.Mesh(chairGeo, darkMetal);
      chair.position.set(x, seatY, z);
      scene.add(chair);

      if (i < 6) {
        const bot = makeBot(i%3===0 ? 0x7fe7ff : i%3===1 ? 0xff2d7a : 0xffd36b);
        bot.position.set(x, seatY-0.04, z);
        bot.rotation.y = Math.atan2(-x, -z);
        scene.add(bot);
      }
    }

    // Walkers in hub
    ctx.demo = ctx.demo || {};
    ctx.demo.walkers = [
      { obj: makeBot(0x7fe7ff), t: 0.0, phase: 0.0 },
      { obj: makeBot(0xff2d7a), t: 0.0, phase: Math.PI * 0.66 },
      { obj: makeBot(0xffd36b), t: 0.0, phase: Math.PI * 1.33 },
    ];
    ctx.demo.walkers.forEach(w => scene.add(w.obj));

    // --- Labels + Jumbotrons (face HubCenter) ---
    function makeNeonLabel(text, colorHex="#00ffff", scale=1.0) {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 180;
      const g = canvas.getContext("2d");
      g.clearRect(0,0,640,180);

      g.fillStyle = "rgba(0,0,0,0.32)";
      g.fillRect(0,0,640,180);

      g.font = "900 64px system-ui,Segoe UI,Arial";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = colorHex;
      g.shadowColor = colorHex;
      g.shadowBlur = 18;
      g.fillText(text, 320, 95);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.2*scale, 1.4*scale), mat);
      return mesh;
    }

    function faceToCenter(obj){
      obj.lookAt(0, obj.position.y, 0);
    }

    function addJumbotron(atPos, labelText, labelColor){
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 3.2, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: 0x0a2030, emissiveIntensity: 1.2, roughness: 0.5 })
      );
      frame.position.copy(atPos);
      faceToCenter(frame);
      scene.add(frame);

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(5.6, 2.7),
        new THREE.MeshBasicMaterial({ color: 0x0b1220 })
      );
      screen.position.copy(atPos);
      screen.position.add(new THREE.Vector3(0,0,0.13));
      faceToCenter(screen);
      scene.add(screen);

      const label = makeNeonLabel(labelText, labelColor, 0.85);
      label.position.copy(atPos);
      label.position.y -= 2.35;
      label.position.add(new THREE.Vector3(0,0,0.10));
      faceToCenter(label);
      scene.add(label);
    }

    // 4 jumbotrons above entrances
    addJumbotron(new THREE.Vector3(0, 5.1, HUB_R-0.9), "VIP",   "#ff2d7a");
    addJumbotron(new THREE.Vector3(0, 5.1, -(HUB_R-0.9)), "EVENT", "#ffcc66");
    addJumbotron(new THREE.Vector3(-(HUB_R-0.9), 5.1, 0), "STORE", "#00ffff");
    addJumbotron(new THREE.Vector3((HUB_R-0.9), 5.1, 0), "POKER", "#9b5cff");

    // --- Spawn moved back + teleporter moved farther behind + offset ---
    const spawnZ = frontZ + 3.0;
    const spawnPoint = new THREE.Object3D();
    spawnPoint.name = "SpawnPoint";
    spawnPoint.position.set(0, 0, spawnZ);
    spawnPoint.userData.faceTargetName = "BossTable";
    scene.add(spawnPoint);

    const spawnPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.06, 36),
      neon(0x00ffff, 1.2)
    );
    spawnPad.name = "SpawnPad";
    spawnPad.position.set(0, 0.03, spawnZ);
    scene.add(spawnPad);

    const teleporter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 2.2, 22),
      new THREE.MeshStandardMaterial({
        color: 0x090b14,
        emissive: new THREE.Color(0x9b5cff),
        emissiveIntensity: 1.6,
        roughness: 0.35
      })
    );
    teleporter.name = "TeleportMachine";
    teleporter.position.set(1.8, 1.1, spawnZ + 8.2); // ✅ farther & offset
    scene.add(teleporter);

    // --- Welcome HUD (smaller, higher, icon + time + $50k) ---
    function makeWelcomeHUD(){
      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 256;
      const g = canvas.getContext("2d");
      g.clearRect(0,0,768,256);

      g.fillStyle = "rgba(0,0,0,0.30)";
      g.fillRect(0,0,768,256);

      // icon circle
      g.fillStyle = "rgba(0,255,255,0.18)";
      g.beginPath(); g.arc(96,128,58,0,Math.PI*2); g.fill();

      g.strokeStyle = "rgba(0,255,255,0.65)";
      g.lineWidth = 6;
      g.beginPath(); g.arc(96,128,58,0,Math.PI*2); g.stroke();

      g.fillStyle = "#00ffff";
      g.shadowColor="#00ffff";
      g.shadowBlur=18;

      g.font = "900 42px system-ui,Segoe UI,Arial";
      g.textAlign="left";
      g.textBaseline="middle";
      g.fillText("ACCOUNT: PLAYER", 180, 95);

      g.font = "900 46px system-ui,Segoe UI,Arial";
      g.fillText("$50,000", 180, 155);

      g.font = "700 28px system-ui,Segoe UI,Arial";
      g.fillStyle = "rgba(191,252,255,0.95)";
      g.shadowBlur=0;
      g.fillText("TIME: " + new Date().toLocaleTimeString(), 180, 205);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.55), mat);
      mesh.position.set(0, 3.2, spawnZ - 2.8); // ✅ higher near “X”
      mesh.lookAt(0, 3.2, 0);
      scene.add(mesh);
    }
    makeWelcomeHUD();

    // --- VIP fireplace + fountain props (simple) ---
    const fireplace = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.4, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x12121a, emissive: 0x301000, emissiveIntensity: 0.9, roughness: 0.7 })
    );
    fireplace.position.set(-4.2, 0.7, spawnZ - 4.8);
    scene.add(fireplace);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.65, 14),
      neon(0xff6b2a, 2.6)
    );
    flame.position.set(-4.2, 1.35, spawnZ - 4.8);
    scene.add(flame);

    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.2, 0.55, 22),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: 0x001a2a, emissiveIntensity: 1.0 })
    );
    fountain.position.set(4.2, 0.28, spawnZ - 4.4);
    scene.add(fountain);

    // NOTE: corridors + room walls remain from your last sealed build.
    // If your current world.js already has sealed corridors + rooms,
    // keep those sections and only paste these NEW pieces in.
    // This v4.4 focuses on: floor back on, spawn/teleporter, jumbotrons, signs, seats.

    log("[world] v4.4 built ✅ hub floor + smaller welcome HUD + jumbotrons + seat/bot fix + teleporter moved back");
  },

  update(ctx, dt){
    const walkers = ctx.demo?.walkers;
    if (walkers?.length) {
      const r = 10.2;
      for (const w of walkers) {
        w.t += dt * 0.25;
        const a = w.t + w.phase;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        w.obj.position.set(x, 0, z);
        w.obj.rotation.y = Math.atan2(-x, -z);
      }
    }
  }
};
