export function createWorldModule() {
  let _objects = [];
  let _table = null;
  let _pipAnchor = null;
  let _botAnchors = [];
  let _hoverCards = [];
  let _communityCards = [];

  const rand = (a, b) => a + Math.random() * (b - a);

  function makeTextSprite(THREE, text, scale = 0.25) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 256;
    const g = canvas.getContext("2d");
    g.clearRect(0,0,canvas.width,canvas.height);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(0,0,canvas.width,canvas.height);
    g.strokeStyle = "rgba(255,255,255,0.25)";
    g.lineWidth = 6;
    g.strokeRect(10,10,canvas.width-20,canvas.height-20);
    g.fillStyle = "white";
    g.font = "bold 58px system-ui";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, canvas.width/2, canvas.height/2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(scale * 2.2, scale, 1);
    return spr;
  }

  function addLight(THREE, scene) {
    const hemi = new THREE.HemisphereLight(0xcfe7ff, 0x0b0b10, 0.55);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(6, 10, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 60;
    key.shadow.camera.left = -15;
    key.shadow.camera.right = 15;
    key.shadow.camera.top = 15;
    key.shadow.camera.bottom = -15;
    scene.add(key);

    const fill = new THREE.PointLight(0x88aaff, 0.35, 30);
    fill.position.set(-6, 4, -6);
    scene.add(fill);

    return [hemi, key, fill];
  }

  function addLobby(THREE, scene) {
    // Floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(18, 96),
      new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Center “divot” / pit ring
    const pit = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 7.5, 96),
      new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 1.0 })
    );
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = 0.01;
    pit.receiveShadow = true;
    scene.add(pit);

    // Balcony ring
    const balcony = new THREE.Mesh(
      new THREE.RingGeometry(12.5, 13.0, 128),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 })
    );
    balcony.rotation.x = -Math.PI / 2;
    balcony.position.y = 2.9;
    scene.add(balcony);

    // Rails
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(12.75, 0.08, 16, 180),
      new THREE.MeshStandardMaterial({ color: 0x2a3342, roughness: 0.4, metalness: 0.2 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 3.05;
    rail.castShadow = true;
    scene.add(rail);

    // Stairs (simple stepped ramp)
    const steps = new THREE.Group();
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });
    for (let i=0;i<10;i++){
      const s = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.5), stepMat);
      s.position.set(8.5, 0.09 + i*0.18, -3 + i*0.5);
      s.castShadow = true; s.receiveShadow = true;
      steps.add(s);
    }
    scene.add(steps);

    // Store zone + display cases
    const store = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.98 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 0.25), wallMat);
    backWall.position.set(-10, 1.5, -6);
    store.add(backWall);

    const sign = makeTextSprite(THREE, "STORE • COSMETICS", 0.8);
    sign.position.set(-10, 2.6, -5.85);
    store.add(sign);

    const caseMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35, metalness: 0.2 });
    for (let i=0;i<3;i++){
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.9), caseMat);
      c.position.set(-12 + i*2.1, 0.5, -4.6);
      c.castShadow = true; c.receiveShadow = true;
      store.add(c);

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(1.62, 1.02, 0.92),
        new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.18, roughness: 0.05, transmission: 1.0 })
      );
      glass.position.copy(c.position);
      store.add(glass);
    }
    scene.add(store);

    return [floor, pit, balcony, rail, steps, store];
  }

  function createPokerTable(THREE, scene) {
    const g = new THREE.Group();
    g.name = "POKER_TABLE";

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 0.25, 64),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.05 })
    );
    base.position.y = 0.9;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(2.85, 2.85, 0.12, 64),
      new THREE.MeshStandardMaterial({ color: 0x0f3d2e, roughness: 1.0, metalness: 0.0 })
    );
    felt.position.y = 1.02;
    felt.receiveShadow = true;
    g.add(felt);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.95, 0.12, 16, 120),
      new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.55, metalness: 0.2 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.06;
    rim.castShadow = true;
    g.add(rim);

    // Dealer chip marker (flat)
    const dealer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.03, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    dealer.rotation.x = Math.PI / 2;
    dealer.position.set(0, 1.08, -0.85);
    dealer.castShadow = true;
    g.add(dealer);

    // Table tags (teaching labels)
    const tag1 = makeTextSprite(THREE, "COMMUNITY", 0.35);
    tag1.position.set(0, 1.25, 0.2);
    g.add(tag1);

    const tag2 = makeTextSprite(THREE, "YOUR SEAT", 0.35);
    tag2.position.set(0, 1.25, 2.0);
    g.add(tag2);

    // Seat rings (5 bots + open seat)
    const seats = new THREE.Group();
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 });
    const seatCount = 6;
    for (let i=0;i<seatCount;i++){
      const ang = (i / seatCount) * Math.PI * 2;
      const r = 4.3;
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,0.2,24), seatMat);
      seat.position.set(Math.sin(ang)*r, 0.55, Math.cos(ang)*r);
      seat.castShadow = true;
      seats.add(seat);
    }
    g.add(seats);

    // Position table in the pit
    g.position.set(0, 0, 0);
    scene.add(g);

    return { group: g, felt };
  }

  function createBot(THREE, name = "BOT") {
    // Simple “humanoid-ish” rig: torso, head, shoulders, elbows, hips/butt
    const bot = new THREE.Group();
    bot.name = name;

    const mat = new THREE.MeshStandardMaterial({ color: 0x243b53, roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 0.9 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 12), mat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    bot.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), skin);
    head.position.y = 1.55;
    head.castShadow = true;
    bot.add(head);

    const butt = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), mat);
    butt.position.y = 0.9;
    butt.scale.set(1.2, 0.9, 1.2);
    butt.castShadow = true;
    bot.add(butt);

    // Arms
    const armGroup = new THREE.Group();
    armGroup.position.y = 1.34;

    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), mat);
    shoulderL.position.set(-0.24, 0, 0);
    shoulderL.castShadow = true;

    const shoulderR = shoulderL.clone();
    shoulderR.position.x = 0.24;

    const upperL = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.18, 4, 10), mat);
    upperL.position.set(-0.34, -0.11, 0.02);
    upperL.rotation.z = 0.7;
    upperL.castShadow = true;

    const elbowL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), mat);
    elbowL.position.set(-0.44, -0.22, 0.06);
    elbowL.castShadow = true;

    const lowerL = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.18, 4, 10), mat);
    lowerL.position.set(-0.49, -0.35, 0.12);
    lowerL.rotation.z = 1.0;
    lowerL.castShadow = true;

    const upperR = upperL.clone(); upperR.position.x *= -1; upperR.rotation.z *= -1;
    const elbowR = elbowL.clone(); elbowR.position.x *= -1;
    const lowerR = lowerL.clone(); lowerR.position.x *= -1; lowerR.rotation.z *= -1;

    armGroup.add(shoulderL, shoulderR, upperL, elbowL, lowerL, upperR, elbowR, lowerR);
    bot.add(armGroup);

    // A “look target” pivot so they can stare at cards
    const lookPivot = new THREE.Object3D();
    lookPivot.name = "lookPivot";
    lookPivot.position.set(0, 1.55, 0);
    bot.add(lookPivot);

    return bot;
  }

  function createCard(THREE, w = 0.28, h = 0.4, color = 0xffffff) {
    const geom = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.0 });
    const m = new THREE.Mesh(geom, mat);
    m.castShadow = true;
    return m;
  }

  function layoutBotsAndCards(THREE, scene, tableGroup) {
    const bots = [];
    const hoverCards = [];
    const botAnchors = [];

    // Seats around table: reserve one for player (front)
    const seatCount = 6;
    const botSeatIdx = [0,1,2,3,4]; // leave idx 5 open for player
    const seatRadius = 3.9;

    for (let i=0;i<botSeatIdx.length;i++){
      const idx = botSeatIdx[i];
      const ang = (idx / seatCount) * Math.PI * 2;

      const bot = createBot(THREE, `BOT_${i+1}`);
      bot.position.set(Math.sin(ang)*seatRadius, 0, Math.cos(ang)*seatRadius);
      bot.lookAt(0, 1.2, 0);
      scene.add(bot);
      bots.push(bot);

      // Anchor for their “hover cards” above their seat
      const anchor = new THREE.Object3D();
      anchor.position.set(Math.sin(ang)*2.0, 1.55, Math.cos(ang)*2.0);
      scene.add(anchor);
      botAnchors.push({ bot, anchor, seatAng: ang });

      // Two hole cards hovering (mirror teaching view)
      const c1 = createCard(THREE, 0.23, 0.33, 0xffffff);
      const c2 = createCard(THREE, 0.23, 0.33, 0xffffff);
      c1.position.set(-0.14, 0, 0);
      c2.position.set( 0.14, 0, 0);
      c1.rotation.x = -0.55; c2.rotation.x = -0.55;
      c1.rotation.y = rand(-0.25, 0.25); c2.rotation.y = rand(-0.25, 0.25);

      const stack = new THREE.Group();
      stack.add(c1, c2);
      anchor.add(stack);

      // A “flat” version on table near them (face-down-ish)
      const flat1 = createCard(THREE, 0.23, 0.33, 0xdddddd);
      const flat2 = createCard(THREE, 0.23, 0.33, 0xdddddd);
      flat1.rotation.x = -Math.PI/2; flat2.rotation.x = -Math.PI/2;
      const rr = 1.85;
      const px = Math.sin(ang)*rr, pz = Math.cos(ang)*rr;
      flat1.position.set(px-0.14, 1.08, pz);
      flat2.position.set(px+0.14, 1.08, pz);
      flat1.rotation.z = rand(-0.35,0.35);
      flat2.rotation.z = rand(-0.35,0.35);
      tableGroup.add(flat1, flat2);

      hoverCards.push({ anchor, stack, seed: rand(0, 1000) });
    }

    // Open player seat marker
    const openSeat = new THREE.Group();
    openSeat.position.set(0, 0, 4.35);
    const tag = makeTextSprite(THREE, "OPEN SEAT", 0.45);
    tag.position.set(0, 1.3, 0);
    openSeat.add(tag);
    scene.add(openSeat);

    // “Guard” + “bystander” walkers
    const guard = createBot(THREE, "GUARD");
    guard.position.set(10, 0, 0);
    guard.userData.walk = { r: 10, s: 0.65, phase: rand(0, Math.PI*2) };
    scene.add(guard);

    const by = createBot(THREE, "BYSTANDER");
    by.position.set(-8, 0, 7);
    by.userData.walk = { r: 5.5, s: 0.45, phase: rand(0, Math.PI*2) };
    scene.add(by);

    return { bots, hoverCards, botAnchors, walkers:[guard, by] };
  }

  function createCommunityCards(THREE, tableGroup) {
    const cards = [];
    const startX = -0.55;
    for (let i=0;i<5;i++){
      const c = createCard(THREE, 0.26, 0.36, 0xffffff);
      c.rotation.x = -Math.PI/2;
      c.position.set(startX + i*0.28, 1.085, 0.25);
      c.rotation.z = (-0.06 + i*0.03);
      tableGroup.add(c);
      cards.push(c);
    }
    return cards;
  }

  return {
    name: "world_full",
    async init(ctx) {
      const { THREE, scene, rig } = ctx;

      const lights = addLight(THREE, scene);
      const lobby = addLobby(THREE, scene);
      _objects.push(...lights, ...lobby);

      const { group: tableGroup } = createPokerTable(THREE, scene);
      _table = tableGroup;
      _objects.push(tableGroup);

      // PIP anchor: overhead-ish camera target
      _pipAnchor = new THREE.Object3D();
      _pipAnchor.name = "PIP_ANCHOR";
      _pipAnchor.position.set(0, 2.7, 1.6);
      scene.add(_pipAnchor);
      _objects.push(_pipAnchor);

      // Bots + hover cards + walkers
      const { hoverCards, botAnchors, walkers } = layoutBotsAndCards(THREE, scene, tableGroup);
      _hoverCards = hoverCards;
      _botAnchors = botAnchors;
      _objects.push(...walkers);

      // Community cards flat on table
      _communityCards = createCommunityCards(THREE, tableGroup);

      // Tell PIP module where to look
      ctx.bus.dispatchEvent(new CustomEvent("pip:setAnchor", { detail: { anchor: _pipAnchor } }));

      // Spawn point (fix “no floor” / “stuck laser” issues by giving a stable rig height)
      rig.position.set(0, 0, 6.0); // you start facing the table
    },

    update(dt, ctx) {
      const t = ctx.now() * 0.001;

      // Hover cards always visible + gentle motion
      for (const h of _hoverCards) {
        const bob = Math.sin(t*1.3 + h.seed) * 0.04;
        h.stack.position.y = bob;
        h.stack.rotation.y = Math.sin(t*0.6 + h.seed) * 0.12;
      }

      // Bots “watch” the table/cards by rotating slightly inward
      for (const b of _botAnchors) {
        b.bot.lookAt(0, 1.15, 0.2);
      }

      // Simple walkers
      for (const obj of _objects) {
        if (!obj?.userData?.walk) continue;
        const w = obj.userData.walk;
        const ang = w.phase + t*w.s;
        obj.position.x = Math.cos(ang) * w.r;
        obj.position.z = Math.sin(ang) * w.r;
        obj.lookAt(0, 1.3, 0);
      }
    },

    dispose(ctx) {
      for (const o of _objects) {
        if (o?.parent) o.parent.remove(o);
      }
      _objects = [];
    }
  };
}
