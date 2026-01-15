// /js/scarlett1/world.js — Scarlett World (Modular) v2.0
// 🚫 NO imports from "three" (Boot2 injects THREE)
// ✅ Modular build pieces
// ✅ Uses addons if available (lighting/poker/humanoids/scorpion) but never requires them

function u(rel){ return new URL(rel, import.meta.url).toString(); }

async function tryImport(label, url, log){
  try{
    const m = await import(url);
    log?.(`${label}: loaded ✅`);
    return m;
  }catch(e){
    log?.(`${label}: missing (ok) :: ${e?.message||e}`);
    return null;
  }
}

export async function initWorld(ctx){
  const { THREE, scene, renderer, camera, player, cameraPitch, controllers, log } = ctx;

  // ---------- WORLD TUNING ----------
  const T = {
    lobbyRadius: 18,     // make bigger/smaller here
    wallHeight: 7.5,     // walls higher
    floorY: 0,

    pitRadius: 7.5,
    pitDepth: 1.25,

    balconyHeight: 3.4,
    balconyDepth: 6.0,

    lightBoost: 1.25
  };

  // ---------- OPTIONAL ADDONS ----------
  const lightingMod  = await tryImport("addon_lighting",  u("../lighting.js"), log);
  const pokerMod     = await tryImport("addon_poker",     u("../poker.js"), log);
  const humanoidsMod = await tryImport("addon_humanoids", u("../humanoids.js"), log);
  const scorpionMod  = await tryImport("addon_scorpion",  u("../scorpion.js"), log);

  // ---------- ROOT GROUP ----------
  const root = new THREE.Group();
  root.name = "WORLD_ROOT";
  scene.add(root);

  // ---------- HELPERS ----------
  const mat = {
    floor: new THREE.MeshStandardMaterial({ color: 0x0b1326, roughness: 0.95, metalness: 0.02 }),
    wall:  new THREE.MeshStandardMaterial({ color: 0x111a32, roughness: 0.9,  metalness: 0.08 }),
    rail:  new THREE.MeshStandardMaterial({ color: 0x1b2a55, roughness: 0.35, metalness: 0.45, emissive: 0x0a2a44, emissiveIntensity: 0.25 }),
    pad:   new THREE.MeshStandardMaterial({ color: 0x0c1a2f, roughness: 0.3,  metalness: 0.55, emissive: 0x146cff, emissiveIntensity: 0.55 }),
    felt:  new THREE.MeshStandardMaterial({ color: 0x0f5a4f, roughness: 0.95, metalness: 0.02 }),
    chair: new THREE.MeshStandardMaterial({ color: 0x1b2a55, roughness: 0.65, metalness: 0.18 })
  };

  function addLightRig(){
    // addon lighting
    if (lightingMod?.createLighting){
      lightingMod.createLighting({ THREE, scene: root, intensity: T.lightBoost });
      return;
    }
    // fallback lighting
    const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x0b0f18, 0.8 * T.lightBoost);
    root.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2 * T.lightBoost);
    dir.position.set(8, 14, 6);
    dir.castShadow = false;
    root.add(dir);

    const fill = new THREE.PointLight(0x66ccff, 0.7 * T.lightBoost, 80);
    fill.position.set(0, 6, 0);
    root.add(fill);
  }

  function buildFloor(){
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(T.lobbyRadius, T.lobbyRadius, 0.35, 72),
      mat.floor
    );
    floor.position.y = T.floorY - 0.175;
    floor.receiveShadow = true;
    root.add(floor);
  }

  function buildWalls(){
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(T.lobbyRadius, T.lobbyRadius, T.wallHeight, 72, 1, true),
      mat.wall
    );
    wall.position.y = T.wallHeight/2;
    root.add(wall);

    // ceiling ring glow
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(T.lobbyRadius-0.5, 0.18, 10, 96),
      new THREE.MeshStandardMaterial({
        color: 0x0d1730,
        emissive: 0x146cff,
        emissiveIntensity: 0.35,
        roughness: 0.4,
        metalness: 0.2
      })
    );
    ring.position.y = T.wallHeight - 0.3;
    ring.rotation.x = Math.PI/2;
    root.add(ring);
  }

  function buildPit(){
    // Pit floor down
    const pit = new THREE.Mesh(
      new THREE.CylinderGeometry(T.pitRadius, T.pitRadius, 0.2, 64),
      new THREE.MeshStandardMaterial({ color: 0x070b14, roughness: 0.95, metalness: 0.05 })
    );
    pit.position.y = -T.pitDepth;
    root.add(pit);

    // Pit wall (inner)
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(T.pitRadius, T.pitRadius, T.pitDepth+0.35, 64, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x0a1020,
        emissive: 0x082a44,
        emissiveIntensity: 0.2,
        roughness: 0.85,
        metalness: 0.1
      })
    );
    pitWall.position.y = -(T.pitDepth)/2;
    root.add(pitWall);

    // Guardrail ring
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(T.pitRadius + 0.6, 0.10, 10, 96),
      mat.rail
    );
    rail.position.y = 0.12;
    rail.rotation.x = Math.PI/2;
    root.add(rail);

    // Posts
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 12);
    for (let i=0;i<24;i++){
      const a = (i/24)*Math.PI*2;
      const p = new THREE.Mesh(postGeo, mat.rail);
      p.position.set(Math.cos(a)*(T.pitRadius+0.6), 0.5, Math.sin(a)*(T.pitRadius+0.6));
      root.add(p);
    }
  }

  function buildStairsToPit(){
    // short stair run to pit edge
    const steps = 8;
    const startR = T.pitRadius + 2.8;
    const endR   = T.pitRadius + 0.9;
    const startY = 0.0;
    const endY   = -T.pitDepth + 0.15;

    const stepGeo = new THREE.BoxGeometry(1.2, 0.18, 0.6);
    const a0 = Math.PI; // place at "south" side
    for (let i=0;i<steps;i++){
      const t = i/(steps-1);
      const r = startR + (endR-startR)*t;
      const y = startY + (endY-startY)*t;
      const s = new THREE.Mesh(stepGeo, mat.wall);
      s.position.set(Math.cos(a0)*r, y, Math.sin(a0)*r);
      s.rotation.y = -a0;
      root.add(s);
    }
  }

  function buildBalcony(){
    // balcony above "store" side (north)
    const balcony = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.35, T.balconyDepth),
      mat.wall
    );
    balcony.position.set(0, T.balconyHeight, -(T.lobbyRadius - T.balconyDepth/2 - 1.0));
    root.add(balcony);

    // balcony rail
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.9, 0.12),
      mat.rail
    );
    rail.position.copy(balcony.position).add(new THREE.Vector3(0, 0.6, T.balconyDepth/2 - 0.12));
    root.add(rail);

    // short stairs up to balcony (right side)
    const steps = 7;
    const stepGeo = new THREE.BoxGeometry(1.0, 0.18, 0.6);
    const baseX = 5.5;
    const baseZ = balcony.position.z + 1.8;
    for (let i=0;i<steps;i++){
      const t = i/(steps-1);
      const y = 0.0 + (T.balconyHeight-0.2)*t;
      const z = baseZ + 2.8*t;
      const s = new THREE.Mesh(stepGeo, mat.wall);
      s.position.set(baseX, y, z);
      root.add(s);
    }

    // telepad on balcony
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.12,28), mat.pad);
    pad.position.set(0, balcony.position.y + 0.22, balcony.position.z);
    pad.name = "TELEPAD_BALCONY";
    root.add(pad);

    return { balconyPad: pad };
  }

  function buildTelepads(){
    const mk = (name,x,y,z)=>{
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.12,28), mat.pad);
      p.position.set(x,y,z);
      p.name = name;
      root.add(p);
      return p;
    };
    const padNorth = mk("TELEPAD_N", 0, 0.06, -(T.lobbyRadius-2.2));
    const padSouth = mk("TELEPAD_S", 0, 0.06,  (T.lobbyRadius-2.2));
    const padEast  = mk("TELEPAD_E", (T.lobbyRadius-2.2), 0.06, 0);
    const padWest  = mk("TELEPAD_W",-(T.lobbyRadius-2.2), 0.06, 0);
    return { padNorth, padSouth, padEast, padWest };
  }

  function buildTableAndChairs(){
    // Use poker addon if exists, else fallback
    let tableGroup = null;
    if (pokerMod?.createPokerTable){
      tableGroup = pokerMod.createPokerTable({ THREE, log, style:"ROUND_8", withChairs:true });
      tableGroup.position.y = -T.pitDepth + 0.25;
      root.add(tableGroup);
    }else{
      tableGroup = new THREE.Group();
      const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.6,3.6,0.25,64), mat.felt);
      felt.position.y = -T.pitDepth + 0.35;
      tableGroup.add(felt);

      // chairs
      const chairGeo = new THREE.BoxGeometry(0.7, 0.8, 0.7);
      for (let i=0;i<8;i++){
        const a = (i/8)*Math.PI*2;
        const c = new THREE.Mesh(chairGeo, mat.chair);
        c.position.set(Math.cos(a)*5.1, -T.pitDepth + 0.4, Math.sin(a)*5.1);
        c.rotation.y = -a + Math.PI;
        tableGroup.add(c);
      }
      root.add(tableGroup);
    }
    return tableGroup;
  }

  function spawnBotsFacingTable(tableGroup){
    if (!tableGroup) return;
    if (!humanoidsMod?.createHumanoidBot){
      // fallback cubes
      const geo = new THREE.BoxGeometry(0.35, 1.2, 0.35);
      const m = new THREE.MeshStandardMaterial({ color: 0x2b79ff, roughness: 0.75, metalness: 0.2 });
      for (let i=0;i<4;i++){
        const a = (i/4)*Math.PI*2;
        const b = new THREE.Mesh(geo, m);
        b.position.set(Math.cos(a)*4.2, -T.pitDepth + 0.65, Math.sin(a)*4.2);
        b.lookAt(0, -T.pitDepth + 0.65, 0);
        root.add(b);
      }
      return;
    }

    for (let i=0;i<5;i++){
      const a = (i/5)*Math.PI*2;
      const bot = humanoidsMod.createHumanoidBot({ THREE, style:"VIP", scale:1.0 });
      bot.position.set(Math.cos(a)*4.2, -T.pitDepth + 0.05, Math.sin(a)*4.2);
      bot.lookAt(0, -T.pitDepth + 0.9, 0);
      root.add(bot);
    }
  }

  function buildRoomSigns(){
    // simple glowing sign blocks
    const mk = (label,x,z)=>{
      log?.(`sign: ${label}`);
      const g = new THREE.BoxGeometry(2.6, 0.65, 0.15);
      const m = new THREE.MeshStandardMaterial({
        color: 0x0d1730,
        emissive: 0x146cff,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.2
      });
      const s = new THREE.Mesh(g,m);
      s.position.set(x, 2.3, z);
      root.add(s);
    };

    mk("STORE",  0, -(T.lobbyRadius-0.6));
    mk("VIP",    (T.lobbyRadius-0.6), 0);
    mk("SCORP",  -(T.lobbyRadius-0.6), 0);
    mk("GAMES",  0, (T.lobbyRadius-0.6));
  }

  function buildScorpionPortal(){
    if (!scorpionMod?.createScorpionPortal) return;
    const p = scorpionMod.createScorpionPortal({ THREE, log });
    p.position.set(-(T.lobbyRadius-3.0), 0.0, 0);
    root.add(p);
  }

  // ---------- BUILD ORDER ----------
  log?.("initWorld() start");
  addLightRig();
  buildFloor();
  buildWalls();
  buildPit();
  buildStairsToPit();
  const pads = buildTelepads();
  const { balconyPad } = buildBalcony();
  buildRoomSigns();

  const tableGroup = buildTableAndChairs();
  spawnBotsFacingTable(tableGroup);
  buildScorpionPortal();

  // spawn point (north)
  const SPAWN_N = new THREE.Vector3(0, 0, (T.lobbyRadius - 4.0));
  player.position.copy(SPAWN_N);
  log?.("spawn ✅ SPAWN_N");

  // ---------- UPDATE LOOP ----------
  let t = 0;
  function update(dt){
    t += dt;

    // gentle glow pulse on pads
    const pulse = 0.45 + 0.25*Math.sin(t*2.2);
    root.traverse(o=>{
      if (o?.material?.emissive && (o.name||"").startsWith("TELEPAD")){
        o.material.emissiveIntensity = pulse;
      }
    });
  }

  log?.("initWorld() completed ✅");
  return { update };
                        }
