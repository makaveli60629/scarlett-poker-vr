import { THREE } from '../core/engine.js';

function makeTextSprite(text, { scale=1, color='#ffffff', bg='rgba(0,0,0,0.0)', padding=14 }={}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const fontSize = 54;
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width + padding*2);
  const h = Math.ceil(fontSize + padding*2);
  c.width = w; c.height = h;
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padding, h/2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const spr = new THREE.Sprite(mat);
  spr.scale.set((w/h)*0.55*scale, 0.55*scale, 1);
  spr.userData._canvas = c;
  spr.userData._ctx = ctx;
  spr.userData._tex = tex;
  spr.userData._text = text;
  return spr;
}

export function TablePokerModule() {
  return {
    name: 'poker_table',
    init(engine) {
      const s = engine.scene;
      const root = new THREE.Group();
      root.position.set(0, -0.2, 0);
      root.name = 'pokerTable';
      s.add(root);

      // Table base + felt
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(4.2, 4.5, 0.8, 48),
        new THREE.MeshStandardMaterial({ color: 0x14121a, roughness: 0.8, metalness: 0.2 })
      );
      base.position.y = 0.4;
      root.add(base);

      const felt = new THREE.Mesh(
        new THREE.CylinderGeometry(3.9, 3.9, 0.14, 64),
        new THREE.MeshStandardMaterial({ color: 0x0ef0ff, emissive: 0x007a80, emissiveIntensity: 0.55, roughness: 0.7, metalness: 0.05 })
      );
      felt.position.y = 0.85;
      root.add(felt);

      // Rail
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(4.0, 0.18, 14, 64),
        new THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.55, metalness: 0.25 })
      );
      rail.position.y = 0.92;
      rail.rotation.x = Math.PI / 2;
      root.add(rail);

      // Community cards (hover higher + upright, always facing the local player)
      const commGroup = new THREE.Group();
      commGroup.name = 'communityCards';
      commGroup.position.set(0, 1.55, 0.95);
      root.add(commGroup);

      const cardGeo = new THREE.PlaneGeometry(0.55, 0.78);
      const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) {
        const card = new THREE.Mesh(cardGeo, cardMat.clone());
        card.position.set(-1.35 + i*0.68, 0, 0);
        // upright (we'll billboard the whole group in update)
        commGroup.add(card);
      }

      // Seat positions (6)
      const seats = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        seats.push({
          x: Math.cos(a) * 6.0,
          z: Math.sin(a) * 6.0,
          r: -a + Math.PI/2,
        });
      }

      // Chairs + name tags + action hints
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x1b2233, roughness: 0.9, metalness: 0.1 });
      const actionMat = new THREE.MeshStandardMaterial({ color: 0x10151f, emissive: 0x1bff9a, emissiveIntensity: 0.0, roughness: 0.5, metalness: 0.0 });

      root.userData.players = [];
      seats.forEach((p, idx) => {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), chairMat);
        chair.position.set(p.x, 0.4, p.z);
        chair.rotation.y = p.r;
        root.add(chair);

        const label = makeTextSprite(idx === 0 ? 'YOU (OPEN)' : `BOT_${idx}`, { scale: 1.0, color: '#ffffff' });
        label.position.set(p.x, 1.8, p.z);
        root.add(label);

        const communityTag = makeTextSprite('COMMUNITY', { scale: 0.9, color: '#aaccff' });
        communityTag.position.set(p.x, 1.55, p.z);
        root.add(communityTag);

        // Action ring indicator
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 32), actionMat.clone());
        ring.position.set(p.x, 0.94, p.z);
        ring.rotation.x = -Math.PI/2;
        root.add(ring);

        const actionText = makeTextSprite('CHECK', { scale: 0.75, color: '#b8ffea' });
        actionText.position.set(p.x, 1.12, p.z);
        root.add(actionText);

        root.userData.players.push({ idx, chair, label, ring, actionText, phase: 0, t: Math.random()*10 });
      });

      // Chips in the center
      const chipMat = new THREE.MeshStandardMaterial({ color: 0xff2255, roughness: 0.35, metalness: 0.1, emissive: 0x33000f, emissiveIntensity: 0.4 });
      for (let i = 0; i < 16; i++) {
        const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24), chipMat);
        chip.position.set((Math.random()-0.5)*0.8, 0.94 + i*0.01, (Math.random()-0.5)*0.8);
        root.add(chip);
      }

      // Mark felt as teleport target too (so you can land on the pit/table area)
      engine.addTeleportTarget(felt);
    },

    update(dt, engine) {
      // Lightweight bot "decision" loop: cycles action indicators
      const root = engine.scene.getObjectByName('pokerTable');
      if (!root) return;
      const players = root.userData.players || [];
      for (const p of players) {
        p.t += dt;
        if (p.t > 4.0 + (p.idx*0.15)) {
          p.t = 0;
          p.phase = (p.phase + 1) % 4;
          const label = ['CHECK', 'BET', 'FOLD', 'RAISE'][p.phase];
          p.actionText.userData._text = label;

          // Update canvas texture
          const spr = p.actionText;
          const c = spr.userData._canvas;
          const ctx = spr.userData._ctx;
          const tex = spr.userData._tex;
          ctx.clearRect(0,0,c.width,c.height);
          ctx.fillStyle = 'rgba(0,0,0,0.0)';
          ctx.fillRect(0,0,c.width,c.height);
          ctx.fillStyle = '#b8ffea';
          ctx.font = '900 54px system-ui, -apple-system, Segoe UI, Roboto, Arial';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, 14, c.height/2);
          tex.needsUpdate = true;

          // Ring "light" (emissive intensity)
          const mat = p.ring.material;
          mat.emissiveIntensity = (p.phase === 1 || p.phase === 3) ? 1.35 : 0.25;
          mat.emissive.setHex((p.phase === 2) ? 0xff3355 : 0x1bff9a);
        }
      }

      // Billboard community cards toward the player's camera (always readable)
      const comm = root.getObjectByName('communityCards');
      if (comm) {
        const camPos = new THREE.Vector3();
        engine.camera.getWorldPosition(camPos);
        comm.lookAt(camPos);
      }
    },
  };
}
