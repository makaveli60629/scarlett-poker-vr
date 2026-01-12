// /js/world.js — Scarlett WORLD 8.6
// ✅ Lobby sealed (no open hall doors) — VIP has teleport pads to other rooms
// ✅ Storefront at lobby wall: 2 glass displays + STORE sign
// ✅ Poker sign + 2 glass displays
// ✅ Wall “alcove” displays for legendary avatars
// ✅ Plants + brighter casino lighting (Quest-stable)
// ✅ Seats + chairs aligned to table; exposes anchors for poker_demo + nametags

export const World = (() => {
  let floors = [];
  const spawns = new Map();

  const demo = {
    tableAnchor: null,
    seatAnchors: [],
    vipPads: [],
    storeFront: null,
    pokerFront: null,
    alcoves: [],
  };

  function build({ THREE, scene, log }) {
    floors = [];
    spawns.clear();
    demo.tableAnchor = null;
    demo.seatAnchors = [];
    demo.vipPads = [];
    demo.storeFront = null;
    demo.pokerFront = null;
    demo.alcoves = [];

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- Materials ----------
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.92, metalness: 0.06, side: THREE.DoubleSide });
    const matWall  = new THREE.MeshStandardMaterial({ color: 0x14182a, roughness: 0.86, metalness: 0.08 });
    const matTrim  = new THREE.MeshStandardMaterial({ color: 0x222a4a, roughness: 0.55, metalness: 0.18 });
    const matGold  = new THREE.MeshStandardMaterial({ color: 0xd2b46a, roughness: 0.25, metalness: 0.90 });
    const matFelt  = new THREE.MeshStandardMaterial({ color: 0x123018, roughness: 0.90, metalness: 0.06 });
    const matLeather = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.55, metalness: 0.12 });

    const matNeonA = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: 0x7fe7ff, emissiveIntensity: 3.5, roughness: 0.25 });
    const matNeonP = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: 0xff2d7a, emissiveIntensity: 3.5, roughness: 0.25 });
    const matBlue  = new THREE.MeshStandardMaterial({ color: 0x2a6bff, emissive: 0x2a6bff, emissiveIntensity: 0.95, roughness: 0.35, metalness: 0.25 });

    const matGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.16,
      roughness: 0.06, metalness: 0.0, transmission: 0.6, thickness: 0.12
    });

    // ---------- Dimensions ----------
    const LOBBY_R = 17.8;
    const WALL_H  = 11.2;
    const WALL_T  = 0.35;

    const pitDepth   = 1.65;
    const rimR       = 6.7;
    const rampInnerR = rimR + 0.20;
    const rampOuterR = rimR + 3.3;

    const tableY = -pitDepth + 0.72;

    // ---------- Lighting (BRIGHT but Quest-stable) ----------
    root.add(new THREE.AmbientLight(0xffffff, 1.18));
    const sun = new THREE.DirectionalLight(0xffffff, 1.55);
    sun.position.set(18, 30, 14);
    root.add(sun);

    const ringMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, emissive: 0xffffff, emissiveIntensity: 2.0, roughness: 0.15, metalness: 0.12 });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(10.4, 0.16, 12, 240), ringMat);
    ring1.position.set(0, 9.8, 0); ring1.rotation.x = Math.PI/2; root.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(7.3, 0.15, 12, 240), ringMat);
    ring2.position.set(0, 9.1, 0); ring2.rotation.x = Math.PI/2; root.add(ring2);

    for (let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const p=new THREE.PointLight(0xffffff, 2.4, 62);
      p.position.set(Math.sin(a)*9.7, 7.6, Math.cos(a)*9.7);
      root.add(p);
    }

    // Add a few spotlights aimed at the pit (bright “casino”)
    for (let i=0;i<5;i++){
      const a=(i/5)*Math.PI*2;
      const s=new THREE.SpotLight(0xffffff, 2.2, 80, Math.PI/10, 0.35, 1.0);
      s.position.set(Math.sin(a)*8.1, 10.6, Math.cos(a)*8.1);
      s.target.position.set(0, 0.5, 0);
      root.add(s, s.target);
    }

    const pitSpot = new THREE.SpotLight(0xffffff, 3.0, 55, Math.PI/7, 0.35, 1.1);
    pitSpot.position.set(0, 10.8, 0);
    pitSpot.target.position.set(0, -pitDepth, 0);
    root.add(pitSpot, pitSpot.target);

    // ---------- Floors + Pit ----------
    const topRing = new THREE.Mesh(new THREE.RingGeometry(rampOuterR, LOBBY_R, 160), matFloor);
    topRing.rotation.x=-Math.PI/2;
    root.add(topRing); floors.push(topRing);

    const ramp = new THREE.Mesh(makeRampRing(THREE, rampInnerR, rampOuterR, -pitDepth, 0, 180), matFloor);
    root.add(ramp); floors.push(ramp);

    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(rimR, 120), matFloor);
    pitFloor.rotation.x=-Math.PI/2;
    pitFloor.position.y=-pitDepth;
    root.add(pitFloor); floors.push(pitFloor);

    const rimCap = new THREE.Mesh(new THREE.TorusGeometry(rampInnerR, 0.11, 14, 240), matTrim);
    rimCap.position.set(0,0.07,0); rimCap.rotation.x=Math.PI/2; root.add(rimCap);

    // Seal skirt band (visually “connects” divot)
    const skirt = new THREE.Mesh(new THREE.TorusGeometry(rampOuterR - 0.02, 0.085, 12, 240), matTrim);
    skirt.position.set(0,0.05,0); skirt.rotation.x=Math.PI/2; root.add(skirt);

    const pitWall = new THREE.Mesh(new THREE.CylinderGeometry(rampInnerR, rampInnerR, pitDepth, 120,1,true), matWall);
    pitWall.position.set(0, -pitDepth/2, 0);
    root.add(pitWall);

    // ---------- Rails (tight, close to rim) + single opening at stairs ----------
    const stairsAngle = 0.0;  // +Z
    const railGapArc  = 0.58; // opening size
    const railRBase   = rampInnerR + 2.25;

    const arcLen = (Math.PI*2) - railGapArc;

    const blueRail = new THREE.Mesh(new THREE.TorusGeometry(railRBase - 0.18, 0.10, 16, 260, arcLen), matBlue);
    blueRail.position.set(0,0.88,0); blueRail.rotation.x=Math.PI/2; blueRail.rotation.z = railGapArc/2; root.add(blueRail);

    const goldRail = new THREE.Mesh(new THREE.TorusGeometry(railRBase - 0.06, 0.10, 16, 260, arcLen), matGold);
    goldRail.position.set(0,1.05,0); goldRail.rotation.x=Math.PI/2; goldRail.rotation.z = railGapArc/2; root.add(goldRail);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(railRBase - 0.06, 0.055, 12, 260, arcLen), matNeonA);
    halo.position.set(0,1.22,0); halo.rotation.x=Math.PI/2; halo.rotation.z = railGapArc/2; root.add(halo);

    // Posts (skip gap)
    const postGeo = new THREE.CylinderGeometry(0.05,0.05,0.92,10);
    for (let i=0;i<24;i++){
      const a=(i/24)*Math.PI*2;
      const d = wrapAngle(a - stairsAngle);
      if (Math.abs(d) < railGapArc*0.52) continue;
      const x=Math.sin(a)*(railRBase-0.06);
      const z=Math.cos(a)*(railRBase-0.06);
      const post=new THREE.Mesh(postGeo, matGold);
      post.position.set(x,0.62,z);
      root.add(post);
    }

    // ---------- Stairs (descend to table) + guard spot (opening is HERE) ----------
    const stairs = buildStairsSolid(THREE, { stepCount:10, stepW:2.2, stepH:pitDepth/10, stepD:0.60, mat: matTrim });
    const stairTop = new THREE.Vector3(0,0.012, rampOuterR - 0.85);
    stairs.position.copy(stairTop);
    stairs.rotation.y = 0;
    root.add(stairs);

    // Smooth collider so locomotion feels clean
    const stairCollider = new THREE.Mesh(new THREE.BoxGeometry(2.6, pitDepth+0.25, 6.6), new THREE.MeshBasicMaterial({ visible:false }));
    stairCollider.position.copy(stairTop).add(new THREE.Vector3(0, -(pitDepth/2), -3.2));
    root.add(stairCollider);
    floors.push(stairCollider);

    const guard = buildGuardBot(THREE);
    guard.position.copy(stairTop).add(new THREE.Vector3(0,0,1.05));
    guard.lookAt(0,0,0);
    root.add(guard);

    // ---------- Table + Chairs + Seat anchors ----------
    const tableAnchor = new THREE.Group();
    tableAnchor.position.set(0, tableY, 0);
    root.add(tableAnchor);
    demo.tableAnchor = tableAnchor;

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.05,3.05,0.25,72), matFelt);
    tableAnchor.add(tableTop);

    const tableTrim = new THREE.Mesh(new THREE.TorusGeometry(3.15,0.17,18,200), matLeather);
    tableTrim.position.set(0,0.22,0); tableTrim.rotation.x=Math.PI/2;
    tableAnchor.add(tableTrim);

    const chairMat = matTrim;
    const seatR = 4.25;
    const seatY = tableY + 0.05;

    for (let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2;
      const x=Math.sin(a)*seatR;
      const z=Math.cos(a)*seatR;

      const chair = new THREE.Group();
      chair.position.set(x, seatY, z);
      chair.lookAt(0, seatY, 0);
      chair.rotateY(Math.PI);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.12,0.7), chairMat);
      seat.position.set(0,0.06,0);
      chair.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.75,0.12), chairMat);
      back.position.set(0,0.45,-0.29);
      chair.add(back);

      tableAnchor.add(chair);

      // seat anchor (for bot placement + nametag + cards)
      const seatAnchor = new THREE.Group();
      seatAnchor.position.copy(chair.position);
      seatAnchor.quaternion.copy(chair.quaternion);
      seatAnchor.name = `SeatAnchor_${i}`;
      tableAnchor.add(seatAnchor);

      demo.seatAnchors.push(seatAnchor);
    }

    // ---------- Lobby walls SEALED (no hall openings) + elegant inset alcoves ----------
    // Full cylinder shell
    const wallShell = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R + WALL_T/2, LOBBY_R + WALL_T/2, WALL_H, 128,1,true),
      matWall
    );
    wallShell.position.set(0, WALL_H/2, 0);
    root.add(wallShell);

    // Neon top trim
    const topBand = new THREE.Mesh(new THREE.TorusGeometry(LOBBY_R + 0.08, 0.10, 12, 240), matNeonA);
    topBand.position.set(0, WALL_H - 0.55, 0);
    topBand.rotation.x = Math.PI/2;
    root.add(topBand);

    // Alcove displays embedded around the dome
    // (visual only: we “inset” frames and put a “legend statue” inside)
    const alcoveAngles = [Math.PI/4, 3*Math.PI/4, -Math.PI/4, -3*Math.PI/4];
    alcoveAngles.forEach((ang, idx) => {
      const pos = polar(ang, LOBBY_R - 0.55);
      const alc = buildAlcove(THREE, { matWall, matTrim, matNeonA });
      alc.position.set(pos.x, 2.2, pos.z);
      alc.rotation.y = ang;
      root.add(alc);
      demo.alcoves.push(alc);

      // “legend” statue
      const statue = buildLegendStatue(THREE, idx);
      statue.position.set(0, 0.65, -0.25);
      alc.add(statue);
    });

    // ---------- Storefront + Pokerfront (at lobby wall) ----------
    // Put them at two “featured” angles on the lobby wall (not open doors)
    const STORE_ANG = 0;          // +X direction “front”
    const POKER_ANG = Math.PI/2;  // +Z direction “front”

    const storePos = polar(STORE_ANG, LOBBY_R - 0.65);
    const pokerPos = polar(POKER_ANG, LOBBY_R - 0.65);

    const storeFront = buildFrontFacade(THREE, {
      title: "STORE",
      neonMat: matNeonA,
      wallMat: matWall,
      trimMat: matTrim,
      glassMat: matGlass
    });
    storeFront.position.set(storePos.x, 0, storePos.z);
    storeFront.rotation.y = STORE_ANG;
    root.add(storeFront);
    demo.storeFront = storeFront;

    const pokerFront = buildFrontFacade(THREE, {
      title: "POKER ROOM",
      neonMat: matNeonP,
      wallMat: matWall,
      trimMat: matTrim,
      glassMat: matGlass
    });
    pokerFront.position.set(pokerPos.x, 0, pokerPos.z);
    pokerFront.rotation.y = POKER_ANG;
    root.add(pokerFront);
    demo.pokerFront = pokerFront;

    // Add “plants” near those facades
    [storeFront, pokerFront].forEach((f) => {
      const p1 = buildPlant(THREE, matTrim, matNeonA);
      p1.position.set(-2.2, 0, 0.65);
      f.add(p1);

      const p2 = buildPlant(THREE, matTrim, matNeonA);
      p2.position.set(2.2, 0, 0.65);
      f.add(p2);
    });

    // ---------- VIP cube + teleport pads inside VIP ----------
    // VIP cube at +X +Z quadrant
    const vipCenter = new THREE.Vector3(LOBBY_R - 1.8, 0, 6.2);

    const vipFloor = new THREE.Mesh(new THREE.BoxGeometry(6.5,0.25,6.5), matFloor);
    vipFloor.position.set(vipCenter.x, -0.12, vipCenter.z);
    root.add(vipFloor);
    floors.push(vipFloor);

    // VIP “pink” glow band
    const vipGlow = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.10, 12, 120), matNeonP);
    vipGlow.position.set(vipCenter.x, 2.7, vipCenter.z);
    vipGlow.rotation.x = Math.PI/2;
    root.add(vipGlow);

    // Spawn inside VIP, facing the table
    const spawnPos = vipCenter.clone().add(new THREE.Vector3(0, 0, -1.2));
    const yawToTable = Math.atan2(0 - spawnPos.x, 0 - spawnPos.z);
    spawns.set("vip_cube", { x: spawnPos.x, y: 0, z: spawnPos.z, yaw: yawToTable });

    // Teleport pads in VIP that will later “send” to rooms
    // (for now: visual pads + anchors — we’ll wire logic next)
    const pads = [
      { name:"TP_STORE",    color: matNeonA, off: new THREE.Vector3(-1.8, 0.0,  1.6) },
      { name:"TP_SCORPION", color: matNeonP, off: new THREE.Vector3( 0.0, 0.0,  1.6) },
      { name:"TP_SPECTATE", color: matNeonA, off: new THREE.Vector3( 1.8, 0.0,  1.6) },
    ];
    pads.forEach((p) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.08,36), matTrim);
      pad.position.copy(vipCenter).add(p.off).add(new THREE.Vector3(0,0.05,0));
      root.add(pad);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62,0.07,10,60), p.color);
      ring.position.copy(pad.position).add(new THREE.Vector3(0,0.06,0));
      ring.rotation.x = Math.PI/2;
      root.add(ring);

      const anchor = new THREE.Group();
      anchor.name = p.name;
      anchor.position.copy(pad.position).add(new THREE.Vector3(0,0,0));
      root.add(anchor);

      demo.vipPads.push(anchor);
    });

    log?.("[world] built ✅ WORLD 8.6 (sealed lobby + fronts + alcoves + VIP pads + seats)");
  }

  // ---------- Geometry helpers ----------
  function makeRampRing(THREE, innerR, outerR, yInner, yOuter, segments=128){
    const positions=[], normals=[], uvs=[], indices=[];
    const addV=(x,y,z,u,v)=>{ positions.push(x,y,z); normals.push(0,1,0); uvs.push(u,v); };
    for (let i=0;i<=segments;i++){
      const t=(i/segments)*Math.PI*2;
      const cx=Math.sin(t), cz=Math.cos(t);
      addV(cx*innerR, yInner, cz*innerR, 0, i/segments);
      addV(cx*outerR, yOuter, cz*outerR, 1, i/segments);
    }
    for (let i=0;i<segments;i++){
      const a=i*2, b=a+1, c=a+2, d=a+3;
      indices.push(a,b,c, b,d,c);
    }
    const g=new THREE.BufferGeometry();
    g.setIndex(indices);
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(normals,3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs,2));
    g.computeVertexNormals();
    return g;
  }

  function buildStairsSolid(THREE, { stepCount, stepW, stepH, stepD, mat }) {
    const g = new THREE.Group();
    for (let i=0;i<stepCount;i++){
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
      step.position.set(0, -stepH/2 - i*stepH, -i*stepD - i*0.001);
      g.add(step);
    }
    return g;
  }

  function buildGuardBot(THREE){
    const g=new THREE.Group();
    const mat=new THREE.MeshStandardMaterial({ color:0x334a7a, roughness:0.55, metalness:0.12 });
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.25,0.70,6,14), mat);
    body.position.set(0,1.1,0); g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.20,18,18), mat);
    head.position.set(0,1.75,0); g.add(head);
    const badge=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.05),
      new THREE.MeshStandardMaterial({ color:0x0b0d14, emissive:0x7fe7ff, emissiveIntensity:2.8 }));
    badge.position.set(0,1.25,0.26); g.add(badge);
    return g;
  }

  function buildFrontFacade(THREE, { title, neonMat, wallMat, trimMat, glassMat }){
    const g=new THREE.Group();
    g.name = `Front_${title}`;

    // frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.2, 0.22), wallMat);
    frame.position.set(0, 1.6, -0.35);
    g.add(frame);

    // two side glass displays
    const left = buildDisplayCase(THREE, { glassMat, trimMat });
    left.position.set(-2.2, 0.0, 0.35);
    g.add(left);

    const right = buildDisplayCase(THREE, { glassMat, trimMat });
    right.position.set(2.2, 0.0, 0.35);
    g.add(right);

    // title plaque (no font textures yet — neon plate for now)
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.55, 0.18), neonMat);
    sign.position.set(0, 2.65, -0.18);
    g.add(sign);

    // small “label bars” under sign (makes it read as text area)
    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.10, 0.12), trimMat);
    bar.position.set(0, 2.38, -0.12);
    g.add(bar);

    // “floor halo” pad
    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.09, 12, 120), neonMat);
    halo.position.set(0, 0.08, 0.85);
    halo.rotation.x = Math.PI/2;
    g.add(halo);

    return g;
  }

  function buildDisplayCase(THREE, { glassMat, trimMat }){
    const g=new THREE.Group();

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.24, 0.90), trimMat);
    base.position.set(0, 0.12, 0.0);
    g.add(base);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.05, 0.82), glassMat);
    glass.position.set(0, 0.78, 0.0);
    g.add(glass);

    // inner “item”
    const item = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), new THREE.MeshStandardMaterial({
      color: 0xd2b46a, roughness: 0.25, metalness: 0.9, emissive: 0x111111, emissiveIntensity: 0.2
    }));
    item.position.set(0, 0.78, 0);
    g.add(item);

    return g;
  }

  function buildAlcove(THREE, { matWall, matTrim, matNeonA }){
    const g=new THREE.Group();

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.4, 0.25), matTrim);
    frame.position.set(0, 0.9, 0.0);
    g.add(frame);

    const inset = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 0.20), matWall);
    inset.position.set(0, 0.9, -0.10);
    g.add(inset);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 0.16), matNeonA);
    glow.position.set(0, 2.05, 0.02);
    g.add(glow);

    return g;
  }

  function buildLegendStatue(THREE, idx){
    const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.65, metalness: 0.05, emissive: 0x111111, emissiveIntensity: 0.25 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.20,0.55,6,12), mat);
    body.position.set(0,0.55,0); g.add(body);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.14,0.18,10), new THREE.MeshStandardMaterial({ color: 0xd2b46a, roughness:0.25, metalness:0.9 }));
    crown.position.set(0,1.05,0); g.add(crown);
    g.rotation.y = idx * 0.4;
    return g;
  }

  function buildPlant(THREE, matPot, matGlow){
    const g=new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.30,0.35,16), matPot);
    pot.position.set(0,0.18,0);
    g.add(pot);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f7a3a, roughness: 0.9, metalness: 0.0 });
    for (let i=0;i<6;i++){
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.10,0.55,10), leafMat);
      leaf.position.set(0,0.55,0);
      leaf.rotation.y = (i/6)*Math.PI*2;
      leaf.rotation.x = -0.55;
      g.add(leaf);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34,0.05,10,40), matGlow);
    ring.position.set(0,0.05,0);
    ring.rotation.x = Math.PI/2;
    g.add(ring);
    return g;
  }

  function polar(a, r){ return { x: Math.sin(a)*r, z: Math.cos(a)*r }; }
  function wrapAngle(a){ while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2; return a; }

  // ---------- API ----------
  function getSpawn() { return spawns.get("vip_cube"); }
  function getFloors() { return floors; }
  function getDemo() { return demo; }

  return { build, getSpawn, getFloors, getDemo };
})();
