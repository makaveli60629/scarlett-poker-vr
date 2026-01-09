// /js/store.js — Scarlett Store v1.0 (Display Window + Teleport Pads)
// Exports: Store
//
// World usage:
//   import { Store } from "./store.js";
//   const store = Store.init({ THREE, scene, world });
//   world.store = store;
//
// Needs from world:
//   world.tableFocus (Vector3) optional
//   world.registerPad(pad) optional helper
//
// Emits:
//   - Sets pad.userData.action = "store" or "poker"
//   - Pads can be used by teleport rays if world exposes them as teleportable meshes

export const Store = {
  init({ THREE, scene, world, log = console.log } = {}) {
    const root = new THREE.Group();
    root.name = "StoreRoot";
    scene.add(root);

    const pads = [];
    const interactables = [];

    // ---------- helpers ----------
    function makeNeonText(text, color = 0x7fe7ff) {
      // simple canvas text plane (no external fonts)
      const c = document.createElement("canvas");
      c.width = 1024; c.height = 256;
      const ctx = c.getContext("2d");
      ctx.clearRect(0,0,c.width,c.height);

      ctx.fillStyle = "rgba(0,0,0,0.0)";
      ctx.fillRect(0,0,c.width,c.height);

      ctx.font = "900 150px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // glow stroke
      ctx.lineWidth = 22;
      ctx.strokeStyle = "rgba(127,231,255,0.35)";
      ctx.strokeText(text, 512, 138);

      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(255,45,122,0.35)";
      ctx.strokeText(text, 512, 138);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, 512, 138);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), mat);
      mesh.renderOrder = 90;
      return mesh;
    }

    function makePad(label, color = 0x7fe7ff) {
      const g = new THREE.Group();
      g.name = "TeleportPad";

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.72, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI/2;
      ring.position.y = 0.02;
      g.add(ring);

      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.52, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
      );
      glow.rotation.x = -Math.PI/2;
      glow.position.y = 0.021;
      g.add(glow);

      const tag = makeNeonText(label, color);
      tag.scale.setScalar(0.35);
      tag.position.set(0, 1.35, 0);
      g.add(tag);

      g.userData.ring = ring;
      g.userData.glow = glow;
      g.userData.tag = tag;
      g.userData.t = Math.random() * 10;

      pads.push(g);
      root.add(g);
      return g;
    }

    function makeGlassWindow(w = 3.4, h = 2.0) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.08,
        metalness: 0.0,
        transmission: 0.95,
        thickness: 0.08,
        transparent: true,
        opacity: 1.0
      });
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      glass.name = "StoreGlass";
      glass.renderOrder = 80;
      return glass;
    }

    function makeShelf() {
      const g = new THREE.Group();
      const wood = new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.85 });
      const metal = new THREE.MeshStandardMaterial({ color: 0x2c3342, roughness: 0.55, metalness: 0.25 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.40), wood);
      base.position.y = 0.04;
      g.add(base);

      const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.2,12), metal);
      poleL.position.set(-1.05, 0.60, 0);
      g.add(poleL);

      const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.2,12), metal);
      poleR.position.set( 1.05, 0.60, 0);
      g.add(poleR);

      for (let i=0;i<3;i++){
        const plank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.36), wood);
        plank.position.set(0, 0.32 + i*0.38, 0);
        g.add(plank);

        // simple “items”
        for (let k=0;k<5;k++){
          const item = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.05, 0.10, 6, 10),
            new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.35, emissive: 0x112233, emissiveIntensity: 0.35 })
          );
          item.position.set(-0.85 + k*0.42, 0.40 + i*0.38, 0);
          item.rotation.z = (Math.random()-0.5)*0.2;
          g.add(item);
        }
      }
      return g;
    }

    function makeDoorPanel(pngUrl, w = 2.3, h = 3.0) {
      // transparent PNG on a plane
      const tex = new THREE.TextureLoader().load(
        pngUrl,
        () => { try { log("[store] door texture loaded ✅"); } catch {} },
        undefined,
        () => { try { log("[store] door texture failed ⚠️"); } catch {} }
      );
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;

      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.name = "DoorPanel";
      mesh.renderOrder = 85;
      return mesh;
    }

    // ---------- build LEFT + RIGHT entrances (not front/back) ----------
    // Assumptions: your room center is around tableFocus. Doors go on ±X walls.
    const center = world?.tableFocus || new THREE.Vector3(0,0,-6.5);

    // You said your door PNG exists (and you also have a zip pack). Put the final PNGs in:
    //   /assets/textures/door_store.png
    //   /assets/textures/door_poker.png
    // (you can rename, just match URLs below)
    const STORE_DOOR = "./assets/textures/door_store.png";
    const POKER_DOOR = "./assets/textures/door_poker.png";

    function buildEntrance(side /* -1 left, +1 right */, type /* "store"|"poker" */) {
      const g = new THREE.Group();
      g.name = `Entrance_${type}_${side < 0 ? "L" : "R"}`;

      const xWall = center.x + side * 11.5;  // pushes to left/right
      const zPos  = center.z + 0.0;          // middle of side wall
      const y0 = 0;

      // Door panel
      const door = makeDoorPanel(type === "store" ? STORE_DOOR : POKER_DOOR, 2.4, 3.1);
      door.position.set(xWall, 1.55, zPos);
      door.rotation.y = side < 0 ? Math.PI/2 : -Math.PI/2;

      // Neon sign above
      const sign = makeNeonText(type === "store" ? "STORE" : "POKER ROOM");
      sign.position.set(xWall, 3.1, zPos);
      sign.rotation.y = door.rotation.y;

      // Pad in front of door
      const pad = makePad(type === "store" ? "Enter Store" : "Enter Poker", type === "store" ? 0xff2d7a : 0x7fe7ff);
      pad.position.set(xWall + (side < 0 ? 1.3 : -1.3), 0, zPos);
      pad.rotation.y = door.rotation.y;
      pad.userData.action = type; // <-- read this inside world.onAction

      // Make pad teleportable
      pad.userData.teleportable = true;

      g.add(door, sign, pad);
      root.add(g);

      interactables.push(pad);
      return { group: g, door, sign, pad };
    }

    const leftStore  = buildEntrance(-1, "store");
    const rightPoker = buildEntrance(+1, "poker");

    // ---------- store display kiosk near STORE door ----------
    const kiosk = new THREE.Group();
    kiosk.name = "StoreKiosk";
    root.add(kiosk);

    kiosk.position.copy(leftStore.pad.position);
    kiosk.position.x += 2.8;
    kiosk.position.z += -1.2;
    kiosk.rotation.y = leftStore.pad.rotation.y;

    const glass = makeGlassWindow(3.6, 2.2);
    glass.position.set(0, 1.55, 0);
    kiosk.add(glass);

    const shelf = makeShelf();
    shelf.position.set(0, 0.0, -0.55);
    kiosk.add(shelf);

    // mannequins behind glass (placeholder)
    for (let i=0;i<3;i++){
      const man = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.22, 1.15, 8, 14),
        new THREE.MeshStandardMaterial({ color: 0x22283a, roughness: 0.75, metalness: 0.05 })
      );
      man.position.set(-1.0 + i*1.0, 1.0, -0.85);
      kiosk.add(man);
    }

    // ---------- update loop (neon pulse) ----------
    function update(dt) {
      for (const p of pads) {
        p.userData.t += dt;
        const s = 0.85 + Math.sin(p.userData.t * 3.0) * 0.10;
        if (p.userData.ring) p.userData.ring.material.opacity = s;
        if (p.userData.glow) p.userData.glow.material.opacity = 0.10 + (1 - s) * 0.12;
      }
    }

    log("[store] init ✅ entrances + kiosk ready");
    return {
      root,
      pads,
      interactables,
      update
    };
  }
};
