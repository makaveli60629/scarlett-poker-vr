import { THREE } from '../core/engine.js';
import { buildCardTextures, shuffleInPlace } from './poker_deck.js';

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
      // Put the table down in the lobby divot/pit.
      root.position.set(0, -1.22, 0);
      root.name = 'pokerTable';
      s.add(root);

      // --- 52 card deck + textures ---
      const { deck, backTex, faceTex } = buildCardTextures();
      root.userData.deck = deck;
      root.userData.backTex = backTex;
      root.userData.faceTex = faceTex;

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
        // Better chair (seat + back + legs)
        const chair = new THREE.Group();
        chair.position.set(p.x, 0.28, p.z);
        chair.rotation.y = p.r;
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.10, 0.82), chairMat);
        seat.position.y = 0.46;
        chair.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.72, 0.10), chairMat);
        back.position.set(0, 0.82, -0.36);
        chair.add(back);
        const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.46, 10);
        [-0.35, 0.35].forEach((lx) => {
          [-0.35, 0.35].forEach((lz) => {
            const leg = new THREE.Mesh(legGeo, chairMat);
            leg.position.set(lx, 0.23, lz);
            chair.add(leg);
          });
        });
        root.add(chair);

        const label = makeTextSprite(idx === 0 ? 'YOU (OPEN)' : `BOT_${idx}`, { scale: 1.0, color: '#ffffff' });
        label.position.set(p.x, 1.8, p.z);
        root.add(label);

        const communityTag = makeTextSprite('COMMUNITY', { scale: 0.9, color: '#aaccff' });
        communityTag.position.set(p.x, 1.55, p.z);
        root.add(communityTag);

        // Action ring indicator (turn highlight)
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 32), actionMat.clone());
        ring.position.set(p.x, 0.92, p.z);
        ring.rotation.x = -Math.PI/2;
        root.add(ring);

        const actionText = makeTextSprite('CHECK', { scale: 0.75, color: '#b8ffea' });
        actionText.position.set(p.x, 1.12, p.z);
        root.add(actionText);

        // Hole cards: flat on table + mirrored hover for teaching
        const cardGeo = new THREE.PlaneGeometry(0.52, 0.74);
        const mkCard = () => {
          const matFront = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide });
          const m = new THREE.Mesh(cardGeo, matFront);
          return m;
        };
        const flat1 = mkCard();
        const flat2 = mkCard();
        const hover1 = mkCard();
        const hover2 = mkCard();

        const towardTable = new THREE.Vector3(0, 0, 0).sub(new THREE.Vector3(p.x, 0, p.z)).normalize();
        const basePos = new THREE.Vector3(p.x, 0.98, p.z).add(towardTable.multiplyScalar(1.35));
        // Flat cards (on felt)
        flat1.position.copy(basePos).add(new THREE.Vector3(-0.18, 0.02, 0));
        flat2.position.copy(basePos).add(new THREE.Vector3(0.18, 0.02, 0));
        flat1.rotation.x = -Math.PI/2;
        flat2.rotation.x = -Math.PI/2;
        root.add(flat1, flat2);

        // Hover teaching cards (upright, face player camera in update)
        hover1.position.set(p.x, 1.85, p.z);
        hover2.position.set(p.x + 0.28, 1.85, p.z);
        root.add(hover1, hover2);

        root.userData.players.push({
          idx,
          chair,
          label,
          ring,
          actionText,
          hole: [flat1, flat2],
          holeHover: [hover1, hover2],
          chips: 1000,
        });
      });

      // Chips (simple stacks per seat + pot stack)
      const chipMat = new THREE.MeshStandardMaterial({ color: 0xff2255, roughness: 0.35, metalness: 0.1, emissive: 0x22000a, emissiveIntensity: 0.25 });
      const chipGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24);
      const pot = new THREE.Group();
      pot.name = 'pot';
      pot.position.set(0, 0.93, 0.0);
      root.add(pot);
      for (let i = 0; i < 18; i++) {
        const chip = new THREE.Mesh(chipGeo, chipMat);
        chip.position.set((Math.random()-0.5)*0.22, i*0.02, (Math.random()-0.5)*0.22);
        pot.add(chip);
      }

      root.userData.chipGeo = chipGeo;
      root.userData.chipMat = chipMat;

      // Deck box on table
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.18, 1.05),
        new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.6, metalness: 0.2, emissive: 0x00131a, emissiveIntensity: 0.45 })
      );
      box.position.set(2.2, 0.98, -0.6);
      root.add(box);

      // --- Card game demo state (deal → flop → turn → river → reset) ---
      root.userData.game = {
        phase: 'idle',
        t: 0,
        deck: [],
        hole: {},
        board: [],
        acting: 1,
      };

      // Start immediately (it is just a teaching loop)
      root.userData.game.phase = 'shuffle';

      // Mark felt as teleport target too (so you can land on the pit/table area)
      engine.addTeleportTarget(felt);
    },

    update(dt, engine) {
      // Poker demo loop + readable teaching UI
      const root = engine.scene.getObjectByName('pokerTable');
      if (!root) return;
      const players = root.userData.players || [];
      const g = root.userData.game;
      g.t += dt;

      const setActionText = (p, label, isHot=false, isFold=false) => {
        const spr = p.actionText;
        const c = spr.userData._canvas;
        const ctx = spr.userData._ctx;
        const tex = spr.userData._tex;
        ctx.clearRect(0,0,c.width,c.height);
        ctx.fillStyle = 'rgba(0,0,0,0.0)';
        ctx.fillRect(0,0,c.width,c.height);
        ctx.fillStyle = isFold ? '#ff9aa8' : '#b8ffea';
        ctx.font = '900 54px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 14, c.height/2);
        tex.needsUpdate = true;

        const mat = p.ring.material;
        mat.emissiveIntensity = isHot ? 1.35 : 0.18;
        mat.emissive.setHex(isFold ? 0xff3355 : (isHot ? 0x1bff9a : 0x0a2230));
      };

      const applyCard = (mesh, code) => {
        const tex = root.userData.faceTex.get(code);
        if (!tex) return;
        mesh.material.map = tex;
        mesh.material.needsUpdate = true;
      };

      const resetCardsToBack = () => {
        // community
        const comm = root.getObjectByName('communityCards');
        if (comm) {
          for (const m of comm.children) {
            m.material.map = root.userData.backTex;
            m.material.needsUpdate = true;
          }
        }
        // hole
        for (const p of players) {
          for (const m of [...p.hole, ...p.holeHover]) {
            m.material.map = root.userData.backTex;
            m.material.needsUpdate = true;
          }
        }
      };

      const shuffleAndDeal = () => {
        const d = root.userData.deck.slice();
        shuffleInPlace(d);
        g.deck = d;
        g.hole = {};
        g.board = [];
        for (const p of players) {
          if (p.idx === 0) continue; // open seat
          g.hole[p.idx] = [g.deck.pop(), g.deck.pop()];
        }
        g.board = [g.deck.pop(), g.deck.pop(), g.deck.pop(), g.deck.pop(), g.deck.pop()];
      };

      const revealCommunity = (n) => {
        const comm = root.getObjectByName('communityCards');
        if (!comm) return;
        for (let i = 0; i < n; i++) {
          applyCard(comm.children[i], g.board[i].code);
        }
      };

      const revealHole = () => {
        for (const p of players) {
          if (p.idx === 0) continue;
          const cards = g.hole[p.idx];
          if (!cards) continue;
          applyCard(p.hole[0], cards[0].code);
          applyCard(p.hole[1], cards[1].code);
          applyCard(p.holeHover[0], cards[0].code);
          applyCard(p.holeHover[1], cards[1].code);
        }
      };

      // --- State machine ---
      if (g.phase === 'shuffle') {
        resetCardsToBack();
        shuffleAndDeal();
        g.t = 0;
        g.phase = 'deal_hole';
        g.acting = 1;
      }

      if (g.phase === 'deal_hole' && g.t > 0.6) {
        revealHole();
        g.t = 0;
        g.phase = 'preflop';
      }

      const actionCycle = (labels) => {
        // highlight a single acting player (bots only)
        const act = players.find(p => p.idx === g.acting);
        for (const p of players) {
          if (p.idx === 0) {
            setActionText(p, 'OPEN', false, false);
            continue;
          }
          const isAct = p.idx === g.acting;
          const label = isAct ? labels[Math.floor((g.t * 1.3) % labels.length)] : 'WAIT';
          const isFold = (label === 'FOLD');
          setActionText(p, label, isAct, isFold);
        }
        if (g.t > 3.2) {
          g.t = 0;
          // next bot
          g.acting++;
          if (g.acting > 5) g.acting = 1;
          return true;
        }
        return false;
      };

      if (g.phase === 'preflop') {
        const advanced = actionCycle(['CHECK','BET','RAISE','FOLD']);
        if (advanced && g.acting === 1) { // full rotation complete
          g.phase = 'flop';
        }
      }

      if (g.phase === 'flop') {
        if (g.t < 0.2) revealCommunity(3);
        const advanced = actionCycle(['CHECK','BET','FOLD','RAISE']);
        if (advanced && g.acting === 1) g.phase = 'turn';
      }

      if (g.phase === 'turn') {
        if (g.t < 0.2) revealCommunity(4);
        const advanced = actionCycle(['CHECK','BET','RAISE','FOLD']);
        if (advanced && g.acting === 1) g.phase = 'river';
      }

      if (g.phase === 'river') {
        if (g.t < 0.2) revealCommunity(5);
        const advanced = actionCycle(['CHECK','BET','FOLD','RAISE']);
        if (advanced && g.acting === 1) g.phase = 'showdown';
      }

      if (g.phase === 'showdown') {
        // quick pot motion to "winner" (for now: BOT_1)
        const winner = players.find(p => p.idx === 1);
        if (winner) {
          setActionText(winner, 'WIN', true, false);
        }
        if (g.t > 2.2) {
          g.t = 0;
          g.phase = 'shuffle';
        }
      }

      // Billboard community cards toward the player's camera (always readable)
      const comm = root.getObjectByName('communityCards');
      if (comm) {
        const camPos = new THREE.Vector3();
        engine.camera.getWorldPosition(camPos);
        comm.lookAt(camPos);
      }

      // Billboard hover hole cards toward the player's camera too
      const camPos2 = new THREE.Vector3();
      engine.camera.getWorldPosition(camPos2);
      for (const p of players) {
        for (const m of p.holeHover || []) {
          m.lookAt(camPos2);
        }
      }
    },
  };
}
