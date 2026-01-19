import { THREE } from '../core/engine.js';

// Investor-friendly sealed circular lobby.
// Kept intentionally lightweight for Quest/Android (no heavy textures, no shadows).

function makeCarpetTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  // base
  ctx.fillStyle = '#071024';
  ctx.fillRect(0, 0, c.width, c.height);
  // subtle weave
  for (let y = 0; y < c.height; y += 6) {
    const a = 0.07 + (Math.random() * 0.06);
    ctx.fillStyle = `rgba(120,180,255,${a})`;
    ctx.fillRect(0, y, c.width, 1);
  }
  for (let x = 0; x < c.width; x += 7) {
    const a = 0.05 + (Math.random() * 0.05);
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(x, 0, 1, c.height);
  }
  // faint geometric pattern
  ctx.strokeStyle = 'rgba(0, 208, 255, 0.08)';
  ctx.lineWidth = 2;
  for (let r = 40; r < 260; r += 30) {
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

function makeWallTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, c.width, c.height);

  // vertical panels
  for (let x = 0; x < c.width; x += 48) {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(x + 2, 0, 2, c.height);
  }
  // neon accent band
  ctx.fillStyle = 'rgba(0, 208, 255, 0.08)';
  ctx.fillRect(0, 30, c.width, 6);
  ctx.fillRect(0, 210, c.width, 6);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  return tex;
}

export function WorldLobbyModule() {
  return {
    name: 'world_lobby',
    init(engine) {
      const s = engine.scene;

      const carpetTex = makeCarpetTexture();
      const wallTex = makeWallTexture();

      // Lighting (brighter but still cheap)
      const ambient = new THREE.AmbientLight(0x8aa0ff, 0.42);
      s.add(ambient);
      const key = new THREE.DirectionalLight(0xffffff, 0.55);
      key.position.set(10, 18, 8);
      s.add(key);
      const cyan = new THREE.PointLight(0x00d0ff, 0.9, 55);
      cyan.position.set(0, 8.5, -20);
      s.add(cyan);
      const mag = new THREE.PointLight(0xa855f7, 0.55, 55);
      mag.position.set(0, 8.5, 20);
      s.add(mag);

      // Ground (carpet)
      const groundMat = new THREE.MeshStandardMaterial({
        map: carpetTex,
        color: 0xffffff,
        roughness: 1.0,
        metalness: 0.0,
      });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.name = 'ground';
      s.add(ground);
      engine.addTeleportTarget(ground);

      // --- Poker pit / divot ---
      // Deeper pit so you can look down at the action from the rim.
      const pitRadius = 12.0;
      const pitDepth = 1.4;

      const pitFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(pitRadius - 0.3, pitRadius - 0.3, 0.18, 80),
        new THREE.MeshStandardMaterial({ color: 0x050a12, roughness: 1.0, metalness: 0.0 })
      );
      pitFloor.position.set(0, -pitDepth, 0);
      s.add(pitFloor);
      engine.addTeleportTarget(pitFloor);

      const pitWall = new THREE.Mesh(
        new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth * 2.0, 96, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x07101a, roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide })
      );
      pitWall.position.set(0, -pitDepth / 2, 0);
      s.add(pitWall);

      // Pit rim neon
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(pitRadius + 0.15, 0.08, 16, 180),
        new THREE.MeshStandardMaterial({ color: 0x00d0ff, emissive: 0x00a0ff, emissiveIntensity: 1.25, roughness: 0.35, metalness: 0.15 })
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 0.03, 0);
      s.add(rim);

      // Stairs down into the pit (bigger + clearer)
      const stairMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.1 });
      const stairRoot = new THREE.Group();
      stairRoot.position.set(0, 0, -(pitRadius - 3.2));
      s.add(stairRoot);
      for (let i = 0; i < 12; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 0.62), stairMat);
        step.position.set(0, -i * (pitDepth / 12), i * 0.64);
        stairRoot.add(step);
        engine.addTeleportTarget(step);
      }

      // --- Sealed circular room (twice-taller walls) ---
      const roomRadius = 65;
      const wallHeight = 14; // "twice the size" feel

      const roomWalls = new THREE.Mesh(
        new THREE.CylinderGeometry(roomRadius, roomRadius, wallHeight, 128, 1, true),
        new THREE.MeshStandardMaterial({
          map: wallTex,
          color: 0xffffff,
          roughness: 0.92,
          metalness: 0.05,
          side: THREE.DoubleSide,
        })
      );
      roomWalls.position.set(0, wallHeight / 2 - 0.2, 0);
      s.add(roomWalls);

      const ceiling = new THREE.Mesh(
        new THREE.CircleGeometry(roomRadius + 1.0, 96),
        new THREE.MeshStandardMaterial({ color: 0x020409, roughness: 1.0, metalness: 0.0, emissive: 0x000611, emissiveIntensity: 0.25 })
      );
      ceiling.position.set(0, wallHeight + 0.1, 0);
      ceiling.rotation.x = -Math.PI / 2;
      s.add(ceiling);

      // Ring lights (two stacked rings)
      const ringMatA = new THREE.MeshStandardMaterial({ color: 0x00d0ff, emissive: 0x00c8ff, emissiveIntensity: 1.0, roughness: 0.3, metalness: 0.1 });
      const ringMatB = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x8b5cf6, emissiveIntensity: 0.85, roughness: 0.3, metalness: 0.1 });
      const lightRing1 = new THREE.Mesh(new THREE.TorusGeometry(26, 0.10, 16, 180), ringMatA);
      lightRing1.rotation.x = Math.PI / 2;
      lightRing1.position.set(0, wallHeight - 0.8, 0);
      s.add(lightRing1);
      const lightRing2 = new THREE.Mesh(new THREE.TorusGeometry(34, 0.12, 16, 180), ringMatB);
      lightRing2.rotation.x = Math.PI / 2;
      lightRing2.position.set(0, wallHeight - 1.2, 0);
      s.add(lightRing2);

      // Stage behind table for promo composition (also a teleport target)
      const stage = new THREE.Mesh(
        new THREE.BoxGeometry(22, 0.7, 7),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.15 })
      );
      stage.position.set(0, 0.35, -22);
      s.add(stage);
      engine.addTeleportTarget(stage);

      // Minimal "store display" pods around the room (not enterable yet)
      const podMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.8, metalness: 0.15, emissive: 0x00131a, emissiveIntensity: 0.6 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xaaccff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.18 });
      const makePod = (angle, labelText) => {
        const g = new THREE.Group();
        const x = Math.cos(angle) * (roomRadius - 10);
        const z = Math.sin(angle) * (roomRadius - 10);
        g.position.set(x, 0, z);
        g.rotation.y = -angle + Math.PI;

        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.4, 24), podMat);
        base.position.y = 0.2;
        g.add(base);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 2.2, 24, 1, true), glassMat);
        glass.position.y = 1.35;
        g.add(glass);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.2, 24), podMat);
        top.position.y = 2.45;
        g.add(top);

        // simple mannequin
        const man = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.22, 0.55, 6, 12),
          new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6, metalness: 0.1 })
        );
        man.position.y = 1.35;
        g.add(man);

        // label (very lightweight plane)
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(2.6, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x0b0f16, emissive: 0x001b2a, emissiveIntensity: 0.9, roughness: 0.9, metalness: 0.0 })
        );
        label.position.set(0, 2.85, 0.1);
        g.add(label);

        // store text via canvas (kept here to avoid importing)
        const c = document.createElement('canvas');
        c.width = 512; c.height = 128;
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0,0,512,128);
        ctx.font = '900 64px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillStyle = '#cfe9ff';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, 28, 64);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        const txt = new THREE.Mesh(
          new THREE.PlaneGeometry(2.4, 0.5),
          new THREE.MeshBasicMaterial({ map: t, transparent: true })
        );
        txt.position.set(0, 2.85, 0.12);
        g.add(txt);

        s.add(g);
        engine.addTeleportTarget(base);
      };

      makePod(Math.PI * 0.25, 'AVATAR SHOP');
      makePod(Math.PI * 0.55, 'VIP ROOM');
      makePod(Math.PI * 0.85, 'TABLES');


      // Premium doors / portals (placeholders for future rooms)
      const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.55, metalness: 0.25, emissive: 0x00131a, emissiveIntensity: 0.65 });
      const doorGlowMat = new THREE.MeshStandardMaterial({ color: 0x00d0ff, emissive: 0x00c8ff, emissiveIntensity: 1.15, roughness: 0.25, metalness: 0.1 });

      const makeDoor = (angle, title) => {
        const g = new THREE.Group();
        const x = Math.cos(angle) * (roomRadius - 6.5);
        const z = Math.sin(angle) * (roomRadius - 6.5);
        g.position.set(x, 0, z);
        g.rotation.y = -angle + Math.PI;

        // frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(6.2, 8.5, 0.55), doorFrameMat);
        frame.position.y = 4.25;
        g.add(frame);

        // inner panel
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 7.6), new THREE.MeshStandardMaterial({ color: 0x020409, roughness: 0.9, metalness: 0.05, emissive: 0x000a12, emissiveIntensity: 0.55 }));
        panel.position.set(0, 4.2, 0.29);
        g.add(panel);

        // neon outline
        const outline = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.07, 10, 120, Math.PI * 2), doorGlowMat);
        outline.rotation.x = Math.PI / 2;
        outline.position.set(0, 8.55, 0.0);
        outline.scale.set(1.05, 1.0, 1.0);
        g.add(outline);

        // sign text
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 256;
        const ctx = c.getContext('2d');
        ctx.clearRect(0,0,c.width,c.height);
        ctx.font = '900 96px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillStyle = '#d7f3ff';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, 48, 128);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
        sign.position.set(0, 7.8, 0.31);
        g.add(sign);

        // teleport pad in front (so you can jump close to the door)
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 32), new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.7, metalness: 0.15, emissive: 0x00131a, emissiveIntensity: 0.75 }));
        pad.position.set(0, 0.06, 2.6);
        g.add(pad);
        engine.addTeleportTarget(pad);

        s.add(g);
      };

      makeDoor(Math.PI * 0.10, 'VIP');
      makeDoor(Math.PI * 0.40, 'AVATAR STORE');
      makeDoor(Math.PI * 0.70, 'TABLES');
    },
  };
}
