// js/world.js
// Scarlett Test Server - Upgraded World + Avatar Mirror + Bots + Cards (Quest-safe)
// Optional: if you place /assets/bot.glb, bots will use it and auto-play animations when present.

export const World = {
  async init({ THREE, scene, renderer, camera, player, log }) {
    const s = {
      THREE, scene, renderer, camera, player,
      log: log || ((...a)=>console.log(...a)),
      root: new THREE.Group(),
      clock: new THREE.Clock(),
      mixers: [],
      bots: { seated: [], walker: null },
      cards: [],
      colliders: { room: { minX:-16, maxX:16, minZ:-16, maxZ:16 }, table: { x:0, z:0, r:3.2 } },
      mirror: null,
      assets: { botUrl: "./assets/bot.glb" },
      touchJoyState: null,
      moveSpeed: 2.0,
      turnSpeed: 1.8,
    };

    scene.add(s.root);

    // ---- Avatar Loader (HUD events) ----
    s.avatar = { obj: null, url: null };
    const gltfLoader = new GLTFLoader();

    async function loadAvatar(url){
      try{
        if(!url) return;
        s.log(`[Avatar] Loading: ${url}`);
        // remove old
        if(s.avatar.obj){ s.root.remove(s.avatar.obj); s.avatar.obj = null; }
        const gltf = await gltfLoader.loadAsync(url);
        const obj = gltf.scene || gltf.scenes?.[0];
        if(!obj) throw new Error("No scene in GLB.");
        obj.traverse(n=>{ if(n.isMesh){ n.frustumCulled=false; n.castShadow=true; n.receiveShadow=true; } });
        obj.position.set(0, 0.0, 2.2); // in front of player
        obj.rotation.y = Math.PI; // face player
        s.root.add(obj);
        s.avatar.obj = obj;
        s.avatar.url = url;
        s.log("[Avatar] Loaded OK.");
      }catch(e){
        s.log("[Avatar] Load error: " + (e?.message||e));
      }
    }

    function clearAvatar(){
      if(s.avatar.obj){ s.root.remove(s.avatar.obj); s.avatar.obj = null; s.avatar.url=null; }
      s.log("[Avatar] Cleared.");
    }

    window.addEventListener('scarlett:loadAvatar', (ev)=>{
      const url = ev?.detail?.url;
      loadAvatar(url);
    });

    window.addEventListener('scarlett:clearAvatar', ()=> clearAvatar());


    // Android touch joystick (safe)
    try{ s.touchJoyState = TouchJoystick(player, s.log); }catch(e){ s.log('[Controls] TouchJoystick failed: '+(e?.message||e)); }
    scene.background = new THREE.Color(0x05070c);
    scene.fog = new THREE.Fog(0x05070c, 10, 55);

    addLighting(s);
    buildRoom(s);
    buildPokerTable(s);
    const seats = buildChairs(s);

    buildMirrorStation(s);
    buildSeatCards(s, seats);
    await buildBots(s, seats);

    s.log("[World] Ready: room + table + mirror + bots + cards.");
    return {
      update(dt, t) {
        const delta = (dt && isFinite(dt)) ? dt : s.clock.getDelta();
        for (const mx of s.mixers) mx.update(delta);
        updateWalker(s, delta, t || 0);
        updateSeatedBreathing(s, t || 0);
        updateCards(s, t || 0);

        // Apply touch joystick movement (forward/back + strafe)
        if(s.touchJoyState){
          const j = s.touchJoyState;
          const forward = -j.dy; // up = forward
          const strafe  = j.dx;
          if(Math.abs(forward) > 0.02 || Math.abs(strafe) > 0.02){
            const yaw = player.rotation.y;
            const cos = Math.cos(yaw);
            const sin = Math.sin(yaw);
            const sp  = s.moveSpeed * delta;
            // forward vector (0,0,-1) rotated by yaw
            player.position.x += (sin * forward + cos * strafe) * sp;
            player.position.z += (cos * forward - sin * strafe) * sp;
          }
        }

        applyCollision(s);
      },
      collide() { applyCollision(s); }
    };
  }
};


// ---- Touch Joystick (Android) ----
// Safe, no dependencies. Creates a left-side joystick and applies movement to player.
function TouchJoystick(player, log){
  const state = { active:false, id:null, cx:0, cy:0, dx:0, dy:0 };
  const el = document.createElement('div');
  el.id = 'touchJoy';
  el.style.cssText = [
    'position:fixed','left:14px','bottom:14px','width:140px','height:140px',
    'border-radius:999px','border:1px solid rgba(0,255,255,0.35)',
    'background:rgba(0,0,0,0.18)','z-index:5000',
    'touch-action:none','pointer-events:auto','user-select:none'
  ].join(';');

  const nub = document.createElement('div');
  nub.style.cssText = [
    'position:absolute','left:50%','top:50%','width:54px','height:54px',
    'margin-left:-27px','margin-top:-27px','border-radius:999px',
    'background:rgba(0,255,255,0.22)','border:1px solid rgba(0,255,255,0.55)'
  ].join(';');
  el.appendChild(nub);
  document.body.appendChild(el);

  function setNub(x,y){
    nub.style.transform = `translate(${x}px, ${y}px)`;
  }
  function begin(ev){
    const t = ev.changedTouches ? ev.changedTouches[0] : ev;
    state.active = true;
    state.id = t.identifier ?? 'mouse';
    const r = el.getBoundingClientRect();
    state.cx = r.left + r.width/2;
    state.cy = r.top + r.height/2;
    state.dx = 0; state.dy = 0;
  }
  function move(ev){
    if(!state.active) return;
    const touches = ev.changedTouches ? Array.from(ev.changedTouches) : [ev];
    const t = touches.find(x => (x.identifier ?? 'mouse') === state.id);
    if(!t) return;
    const mx = (t.clientX - state.cx);
    const my = (t.clientY - state.cy);
    const max = 40;
    const len = Math.hypot(mx,my) || 1;
    const sx = (len > max) ? mx/len*max : mx;
    const sy = (len > max) ? my/len*max : my;
    state.dx = sx / max;
    state.dy = sy / max;
    setNub(sx, sy);
  }
  function end(ev){
    const touches = ev.changedTouches ? Array.from(ev.changedTouches) : [ev];
    const hit = touches.find(x => (x.identifier ?? 'mouse') === state.id);
    if(!hit) return;
    state.active = false;
    state.id = null;
    state.dx = 0; state.dy = 0;
    setNub(0,0);
  }

  el.addEventListener('touchstart', (e)=>{ e.preventDefault(); begin(e); }, { passive:false });
  el.addEventListener('touchmove', (e)=>{ e.preventDefault(); move(e); }, { passive:false });
  el.addEventListener('touchend', (e)=>{ e.preventDefault(); end(e); }, { passive:false });
  el.addEventListener('touchcancel', (e)=>{ e.preventDefault(); end(e); }, { passive:false });

  // fallback mouse for desktop testing
  el.addEventListener('pointerdown', (e)=>{ begin(e); }, { passive:true });
  window.addEventListener('pointermove', (e)=>{ move(e); }, { passive:true });
  window.addEventListener('pointerup', (e)=>{ end(e); }, { passive:true });

  log && log('[Controls] TouchJoystick ready.');
  return state;
}
function addLighting(s){
  const { THREE, root } = s;
  root.add(new THREE.AmbientLight(0x4a5a6a, 0.75));

  const key = new THREE.DirectionalLight(0x88ccff, 1.0);
  key.position.set(6, 10, 4);
  root.add(key);

  const fill = new THREE.DirectionalLight(0x66ffff, 0.55);
  fill.position.set(-8, 7, -6);
  root.add(fill);
}

function buildRoom(s){
  const { THREE, root } = s;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x0b1420, roughness: 0.95, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  root.add(floor);

  const grid = new THREE.GridHelper(40, 40, 0x00ffff, 0x113344);
  grid.position.y = 0.01;
  root.add(grid);

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(40, 10, 40),
    new THREE.MeshStandardMaterial({ color: 0x070b12, roughness: 1.0, metalness: 0.0, side: THREE.BackSide })
  );
  walls.position.y = 5;
  root.add(walls);

  const stripMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.5,
    roughness: 0.4, metalness: 0.0
  });
  for (let i=0;i<4;i++){
    const strip = new THREE.Mesh(new THREE.BoxGeometry(12, 0.08, 0.18), stripMat);
    strip.position.set(0, 9.2, -6 + i*4);
    root.add(strip);
  }
}

function buildPokerTable(s){
  const { THREE, root } = s;
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.0, 3.15, 0.28, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a1b2a, roughness: 0.9, metalness: 0.0 })
  );
  felt.position.set(0, 0.72, 0);
  root.add(felt);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.05, 0.22, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0x1b0f0b, roughness: 0.7, metalness: 0.1 })
  );
  rail.rotation.x = Math.PI/2;
  rail.position.set(0, 0.86, 0);
  root.add(rail);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.8, 0.9, 32),
    new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.85, metalness: 0.05 })
  );
  base.position.set(0, 0.35, 0);
  root.add(base);
}

function buildChairs(s){
  const { THREE, root } = s;
  const seats = [];
  const r = 4.25;
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x0f1a28, roughness: 0.95, metalness: 0.0 });

  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2 + Math.PI;
    const x = Math.cos(a)*r;
    const z = Math.sin(a)*r;

    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.10, 0.65), chairMat);
    seat.position.y = 0.45;
    chair.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.70, 0.10), chairMat);
    back.position.set(0, 0.85, -0.28);
    chair.add(back);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.45, 12), chairMat);
    stem.position.y = 0.22;
    chair.add(stem);

    const feet = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 16), chairMat);
    feet.position.y = 0.02;
    chair.add(feet);

    chair.position.set(x, 0, z);
    chair.rotation.y = Math.atan2(-x, -z);
    root.add(chair);

    seats.push({ index:i, chair, x, z, yaw: chair.rotation.y });
  }
  seats.push({ index:6, chair:null, x:0, z:-5.2, yaw: 0 });
  return seats;
}

function buildMirrorStation(s){
  const { THREE, root, renderer } = s;
  const rt = new THREE.WebGLRenderTarget(512, 512, { depthBuffer: true });
  const mirrorCam = new THREE.PerspectiveCamera(55, 1, 0.1, 50);

  const pose = new THREE.Object3D();
  pose.position.set(0, 1.5, 6.0);
  root.add(pose);

  mirrorCam.position.set(0, 1.8, 8.5);
  mirrorCam.lookAt(pose.position);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.2),
    new THREE.MeshBasicMaterial({ map: rt.texture })
  );
  screen.position.set(6.5, 1.8, 6.0);
  screen.rotation.y = -Math.PI/2;
  root.add(screen);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 2.3, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x001018, roughness: 0.4, metalness: 0.2 })
  );
  frame.position.copy(screen.position);
  frame.rotation.copy(screen.rotation);
  root.add(frame);

  const label = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.12, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.2 })
  );
  label.position.set(6.5, 0.55, 6.0);
  label.rotation.y = -Math.PI/2;
  root.add(label);

  s.mirror = { rt, mirrorCam, screen, pose };

  const originalRender = renderer.render.bind(renderer);
  if (!renderer.__scarlettMirrorPatched){
    renderer.__scarlettMirrorPatched = true;
    renderer.__scarlettMirrorTick = 0;
    renderer.render = function(sc, cam){
      try{
        const now = performance.now();
        if(now - renderer.__scarlettMirrorTick > 33){
          renderer.__scarlettMirrorTick = now;
          if(s.mirror){
            const prev = renderer.getRenderTarget();
            renderer.setRenderTarget(s.mirror.rt);
            originalRender(sc, s.mirror.mirrorCam);
            renderer.setRenderTarget(prev);
          }
        }
      }catch(_){}
      originalRender(sc, cam);
    };
  }
}

function buildSeatCards(s, seats){
  const { THREE, root } = s;

  function makeCardTexture(rank, suit){
    const c = document.createElement("canvas");
    c.width = 256; c.height = 356;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#f7f7f7"; ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle = "#111"; ctx.lineWidth = 8;
    ctx.strokeRect(10,10,c.width-20,c.height-20);
    ctx.fillStyle = (suit==="♥"||suit==="♦") ? "#d11" : "#111";
    ctx.font = "bold 72px monospace";
    ctx.fillText(rank, 28, 92);
    ctx.font = "bold 90px monospace";
    ctx.fillText(suit, 95, 210);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    return tex;
  }

  const ranks = ["A","K","Q","J","10","9"];
  const suits = ["♠","♥","♦","♣","♠","♥"];

  for (let i=0;i<6;i++){
    const seat = seats[i];
    const origin = new THREE.Vector3(seat.x, 1.15, seat.z);
    const dirToCenter = new THREE.Vector3(0, 1.15, 0).sub(origin).normalize();
    const base = origin.clone().add(dirToCenter.multiplyScalar(1.1));

    for (let k=0;k<2;k++){
      const tex = makeCardTexture(ranks[(i+k)%ranks.length], suits[(i+k)%suits.length]);
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.31),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      card.position.copy(base);
      card.position.x += (k===0 ? -0.13 : 0.13);
      card.position.y += 0.10;
      card.rotation.y = Math.atan2(-seat.x, -seat.z);
      root.add(card);
      s.cards.push({ mesh: card, baseY: card.position.y, phase: (i*0.7+k)*0.9 });
    }
  }
}

function updateCards(s, t){
  for (const c of s.cards){
    c.mesh.position.y = c.baseY + Math.sin(t*1.4 + c.phase)*0.015;
    c.mesh.rotation.z = Math.sin(t*0.9 + c.phase)*0.03;
  }
}

async function buildBots(s, seats){
  const { THREE, root } = s;

  let GLTFLoader = null;
  try{
    const mod = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js");
    GLTFLoader = mod.GLTFLoader;
  }catch(e){
    s.log("[World] GLTFLoader unavailable (CDN). Using procedural bots only.");
  }

  let botGLB = null;
  if (GLTFLoader){
    try{
      botGLB = await loadGLB(GLTFLoader, s.assets.botUrl);
      s.log("[World] bot.glb loaded (optional).");
    }catch(e){
      s.log("[World] bot.glb not found or blocked. Using procedural bots.");
    }
  }

  for (let i=0;i<6;i++){
    const seat = seats[i];
    const bot = makeBotInstance(s, botGLB, { seated:true, index:i });
    bot.group.position.set(seat.x, 0.0, seat.z);
    bot.group.rotation.y = seat.yaw;
    const back = new THREE.Vector3(0,0,0.28).applyAxisAngle(new THREE.Vector3(0,1,0), bot.group.rotation.y);
    bot.group.position.add(back);
    root.add(bot.group);
    s.bots.seated.push(bot);
  }

  const walker = makeBotInstance(s, botGLB, { seated:false, index:99 });
  walker.group.position.set(0, 0.0, 6.0);
  walker.group.rotation.y = Math.PI;
  root.add(walker.group);
  s.bots.walker = walker;
}

function makeProceduralHumanoid(THREE){
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x00aaff, roughness: 0.35, metalness: 0.1 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.65, 6, 12), mat);
  body.position.y = 1.05;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
  head.position.y = 1.60;
  g.add(head);

  const limbMat = new THREE.MeshStandardMaterial({ color: 0x0ff0ff, roughness: 0.25, metalness: 0.0 });
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.35, 4, 10), limbMat);
  const armR = armL.clone();
  armL.position.set(-0.32, 1.18, 0);
  armR.position.set( 0.32, 1.18, 0);
  g.add(armL); g.add(armR);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.42, 4, 10), limbMat);
  const legR = legL.clone();
  legL.position.set(-0.14, 0.55, 0);
  legR.position.set( 0.14, 0.55, 0);
  g.add(legL); g.add(legR);

  g.userData.limbs = { armL, armR, legL, legR, body, head };
  return g;
}

function makeBotInstance(s, botGLB, { seated, index }){
  const { THREE } = s;
  const group = new THREE.Group();
  group.name = seated ? `SeatedBot_${index}` : `WalkerBot_${index}`;

  let model = null;
  let procedural = null;

  if (botGLB && botGLB.scene){
    model = botGLB.scene.clone(true);
    model.traverse((o)=>{
      if(o.isMesh){
        o.frustumCulled = false;
        if(o.material){
          o.material.transparent = false;
          o.material.opacity = 1.0;
          o.material.depthWrite = true;
          o.material.side = THREE.FrontSide;
        }
      }
    });
    group.add(model);

    if (botGLB.animations && botGLB.animations.length){
      const mixer = new THREE.AnimationMixer(model);
      s.mixers.push(mixer);
      const clip = pickClip(botGLB.animations, seated ? ["sit","idle"] : ["walk","run"]);
      if (clip){
        const act = mixer.clipAction(clip);
        act.reset().play();
        act.enabled = true;
        act.setEffectiveWeight(1.0);
      }
    }

    const box = new THREE.Box3().setFromObject(model);
    const h = box.max.y - box.min.y;
    const scale = h > 0.001 ? (1.72 / h) : 1.0;
    model.scale.setScalar(scale);
    model.position.y = 0.0;

  } else {
    procedural = makeProceduralHumanoid(THREE);
    group.add(procedural);
  }

  if (seated){
    if (procedural?.userData?.limbs){
      const L = procedural.userData.limbs;
      L.legL.rotation.x = -0.75;
      L.legR.rotation.x = -0.75;
      L.armL.rotation.x = -0.25;
      L.armR.rotation.x = -0.25;
      procedural.position.y = -0.15;
    } else if (model){
      model.position.y = -0.15;
    }
  }

  return {
    group,
    procedural,
    stridePhase: 0,
    walkSpeed: 1.35,
    walkRadius: 6.2,
    walkAngle: Math.PI,
  };
}

function pickClip(clips, keywords){
  if(!clips || !clips.length) return null;
  const lower = clips.map(c=>({ c, n:(c.name||"").toLowerCase() }));
  for(const k of keywords){
    const hit = lower.find(x=>x.n.includes(k));
    if(hit) return hit.c;
  }
  return clips[0];
}

function loadGLB(GLTFLoader, url){
  return new Promise((resolve, reject)=>{
    const loader = new GLTFLoader();
    loader.load(url, resolve, undefined, reject);
  });
}

function updateWalker(s, dt, t){
  const w = s.bots.walker;
  if(!w) return;

  w.walkAngle += dt * (w.walkSpeed / w.walkRadius);
  const x = Math.cos(w.walkAngle) * w.walkRadius;
  const z = Math.sin(w.walkAngle) * w.walkRadius;
  const prevX = w.group.position.x;
  const prevZ = w.group.position.z;
  w.group.position.set(x, 0.0, z);

  const dx = x - prevX;
  const dz = z - prevZ;

  if (dx*dx + dz*dz > 1e-6){
    w.group.rotation.y = Math.atan2(dx, dz);
  }

  const dist = Math.hypot(dx, dz);
  w.stridePhase += dist * 6.0;

  if (w.procedural?.userData?.limbs){
    const L = w.procedural.userData.limbs;
    const a = Math.sin(w.stridePhase);
    const b = Math.sin(w.stridePhase + Math.PI);
    L.legL.rotation.x = a * 0.65;
    L.legR.rotation.x = b * 0.65;
    L.armL.rotation.x = b * 0.45;
    L.armR.rotation.x = a * 0.45;
    w.procedural.position.y = Math.sin(w.stridePhase*2) * 0.02;
  }
}

function updateSeatedBreathing(s, t){
  for (const b of s.bots.seated){
    if (b.procedural?.userData?.limbs){
      const L = b.procedural.userData.limbs;
      const breathe = 1 + Math.sin(t*1.6 + b.group.position.x)*0.015;
      L.body.scale.set(1, breathe, 1);
      L.head.rotation.y = Math.sin(t*0.35 + b.group.position.z)*0.25;
    }
  }
}

function applyCollision(s){
  const { player } = s;
  if(!player) return;

  const r = 0.35;
  player.position.x = clamp(player.position.x, s.colliders.room.minX + r, s.colliders.room.maxX - r);
  player.position.z = clamp(player.position.z, s.colliders.room.minZ + r, s.colliders.room.maxZ - r);

  const dx = player.position.x - s.colliders.table.x;
  const dz = player.position.z - s.colliders.table.z;
  const d = Math.hypot(dx, dz);
  const minD = s.colliders.table.r + r;
  if (d < minD){
    const k = (minD / (d || 0.0001));
    player.position.x = s.colliders.table.x + dx * k;
    player.position.z = s.colliders.table.z + dz * k;
  }

  if (player.position.y < 0) player.position.y = 0;
}

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }


function updateWalkerBot(s, dt, t) {
  const w = s.walker;
  if(!w || !w.group) return;

  // If we later attach a real animated GLB with a mixer, update it
  if(w.mixer){ w.mixer.update(dt); }

  // Walk path around table (simple loop)
  w.t += dt * w.speed;
  const R = 3.6;
  const ang = (w.t * 0.25) % (Math.PI * 2);
  const x = Math.cos(ang) * R;
  const z = Math.sin(ang) * R;
  w.group.position.x = x;
  w.group.position.z = z;
  w.group.position.y = 0.0;
  w.group.rotation.y = -ang + Math.PI / 2;

  // Procedural walk cycle (visible arm/leg swing)
  const stride = Math.sin(w.t * 6.0);
  const swing = stride * 0.65;
  const lift  = Math.max(0, Math.sin(w.t * 6.0)) * 0.08;

  if(w.limbs){
    w.limbs.armL.rotation.x =  swing;
    w.limbs.armR.rotation.x = -swing;
    w.limbs.legL.rotation.x = -swing;
    w.limbs.legR.rotation.x =  swing;

    w.limbs.legL.position.y = -0.55 + lift;
    w.limbs.legR.position.y = -0.55 + (0.08 - lift);
  }
}
