/* Scarlett VR Poker v8 — Android Monolith Debug Build
   - No ES module imports
   - Global THREE from three.min.js
*/
(() => {
  const BUILD = "SCARLETT_PERMA_DEMO_FIX_v8_MONOLITH_ANDROID_SAFE";
  const $ = (id)=>document.getElementById(id);

  // --- Diagnostics ---
  const diagEl = $("diag");
  const t0 = performance.now();
  function ts(){
    const ms = performance.now() - t0;
    const s = Math.floor(ms/1000);
    const m = String(Math.floor(s/60)).padStart(2,"0");
    const ss = String(s%60).padStart(2,"0");
    const ms3 = String(Math.floor(ms%1000)).padStart(3,"0");
    return `[${m}:${ss}.${ms3}]`;
  }
  function dwrite(msg){
    try{
      diagEl.textContent += `${ts()} ${msg}\n`;
      diagEl.scrollTop = diagEl.scrollHeight;
    }catch(_){}
  }

  // fingerprint
  dwrite(`booting… BUILD=${BUILD}`);
  dwrite(`href=${location.href}`);
  dwrite(`secureContext=${window.isSecureContext}`);
  dwrite(`ua=${navigator.userAgent}`);
  dwrite(`touch=${("ontouchstart" in window)} maxTouchPoints=${navigator.maxTouchPoints||0}`);
  dwrite(`xr=${!!navigator.xr}`);

  // --- HUD buttons ---
  const btnEnterVR = $("btnEnterVR");
  const btnTeleport = $("btnTeleport");
  const btnReset = $("btnReset");
  const btnHide = $("btnHide");
  const btnDiag = $("btnDiag");
  const btnJoinSeat = $("btnJoinSeat");
  const btnLeaveSeat = $("btnLeaveSeat");
  const hud = $("hud");

  let hudHidden = false;
  btnHide.onclick = () => {
    hudHidden = !hudHidden;
    diagEl.style.display = hudHidden ? "none" : "";
    $("help").style.display = hudHidden ? "none" : "";
    btnDiag.style.display = hudHidden ? "none" : "";
    btnEnterVR.style.display = hudHidden ? "none" : "";
    btnTeleport.style.display = hudHidden ? "none" : "";
    btnReset.style.display = hudHidden ? "none" : "";
    btnHide.textContent = hudHidden ? "Show HUD" : "Hide HUD";
    btnJoinSeat.style.display = "none";
    btnLeaveSeat.style.display = "none";
  };
  btnDiag.onclick = () => {
    diagEl.style.display = (diagEl.style.display === "none") ? "" : "none";
  };

  // --- Audio (local wav + fallback) ---
  const AC = window.AudioContext || window.webkitAudioContext;
  const audio = { ctx: null, buffers: new Map(), ambience: null };
  function audioInit(){
    if (audio.ctx) return;
    if (!AC) return;
    audio.ctx = new AC();
  }
  async function loadBuf(name,url){
    if (!audio.ctx) return null;
    try{
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await audio.ctx.decodeAudioData(arr);
      audio.buffers.set(name, buf);
      return buf;
    }catch(e){
      dwrite(`[audio] failed ${name}: ${e?.message||e}`);
      return null;
    }
  }
  function playBuf(name,gain=0.25,loop=false){
    if (!audio.ctx) return null;
    const buf = audio.buffers.get(name);
    if (!buf) return null;
    const src = audio.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    const g = audio.ctx.createGain();
    g.gain.value = gain;
    src.connect(g); g.connect(audio.ctx.destination);
    src.start();
    return src;
  }
  function beep(freq=440, ms=80, type="sine", gain=0.06){
    if (!audio.ctx) return;
    const o = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g); g.connect(audio.ctx.destination);
    o.start(); setTimeout(()=>{try{o.stop();}catch(_){ }}, ms);
  }
  const cues = {
    teleport(){ (playBuf("teleport",0.35,false) || (beep(620,70,"triangle",0.05),null)); },
    chip(){ (playBuf("chip",0.30,false) || (beep(760,45,"triangle",0.03),null)); },
    card(){ (playBuf("card",0.25,false) || (beep(980,40,"square",0.025),null)); },
    joinSeat(){ (playBuf("chip",0.25,false) || (beep(520,90,"sine",0.05),null)); },
    standUp(){ (playBuf("chip",0.22,false) || (beep(330,90,"sine",0.05),null)); }
  };
  async function audioUnlock(){
    audioInit();
    if (!audio.ctx) return;
    try{ await audio.ctx.resume(); }catch(_){}
    await Promise.all([
      loadBuf("chip","./assets/audio/chip.wav"),
      loadBuf("card","./assets/audio/card.wav"),
      loadBuf("teleport","./assets/audio/teleport.wav"),
      loadBuf("ambience","./assets/audio/ambience.wav"),
    ]);
    if (!audio.ambience){
      audio.ambience = playBuf("ambience",0.08,true);
    }
    dwrite("[audio] ready ✅");
    window.removeEventListener("pointerdown", audioUnlock);
    window.removeEventListener("touchstart", audioUnlock);
  }
  window.addEventListener("pointerdown", audioUnlock, { once:true });
  window.addEventListener("touchstart", audioUnlock, { once:true });

  // --- THREE basics ---
  const THREE = window.THREE;
  if (!THREE){
    dwrite("[fatal] THREE not found");
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07070c);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 1200);
  const rig = new THREE.Group();
  rig.name = "rig";
  rig.add(camera);
  scene.add(rig);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 1.15));
  const dir = new THREE.DirectionalLight(0xffffff, 0.75);
  dir.position.set(6,12,6);
  scene.add(dir);

  // --- World build ---
  function buildWorld(){
    dwrite("[world] buildWorld()");

    const root = new THREE.Group();
    root.name = "worldRoot";
    scene.add(root);

    // Floor grid
    const grid = new THREE.GridHelper(120, 120, 0x444455, 0x222233);
    grid.position.y = 0.001;
    root.add(grid);

    // Casino shell (walls + ceiling)
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x0f0f18, roughness:0.95 });
    const wallGeo = new THREE.BoxGeometry(60, 16, 1);
    const wall1 = new THREE.Mesh(wallGeo, shellMat); wall1.position.set(0,8,-28); root.add(wall1);
    const wall2 = new THREE.Mesh(wallGeo, shellMat); wall2.position.set(0,8, 28); root.add(wall2);
    const wall3 = new THREE.Mesh(new THREE.BoxGeometry(1,16,56), shellMat); wall3.position.set(-30,8,0); root.add(wall3);
    const wall4 = new THREE.Mesh(new THREE.BoxGeometry(1,16,56), shellMat); wall4.position.set( 30,8,0); root.add(wall4);
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(60,1,56), new THREE.MeshStandardMaterial({ color:0x09090f, roughness:0.98 }));
    ceil.position.set(0,16,0); root.add(ceil);
    dwrite("[shell] casino shell ready");

    // Environment extras (bar/vip/stairs/balcony/cases)
    (function envExtras(){
      const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness:0.55, metalness:0.08 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness:0.95 });
      const neonPink = new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0xff00aa, emissiveIntensity:1.0, roughness:0.35 });
      const neonBlue = new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0x2aa3ff, emissiveIntensity:1.0, roughness:0.35 });
      const glass = new THREE.MeshStandardMaterial({ color:0x99ccff, roughness:0.12, transparent:true, opacity:0.22 });

      const bar = new THREE.Mesh(new THREE.BoxGeometry(12,1.2,2.2), wood); bar.position.set(16,0.6,-10); root.add(bar);
      const barTop = new THREE.Mesh(new THREE.BoxGeometry(12.2,0.15,2.4), new THREE.MeshStandardMaterial({ color:0x1a1a1f, roughness:0.25, metalness:0.2 }));
      barTop.position.set(16,1.275,-10); root.add(barTop);

      const vipBase = new THREE.Mesh(new THREE.BoxGeometry(10,0.3,6), dark); vipBase.position.set(-16,0.15,-12); root.add(vipBase);
      const vipNeon = new THREE.Mesh(new THREE.BoxGeometry(6,0.6,0.25), neonPink); vipNeon.position.set(-16,3.8,-16.8); root.add(vipNeon);

      for (let i=0;i<10;i++){
        const step = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.18,0.8), new THREE.MeshStandardMaterial({ color:0x2a2a33, roughness:0.9 }));
        step.position.set(24,0.09+i*0.18,10-i*0.85); root.add(step);
      }
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(16,0.35,10), dark); balcony.position.set(22,2.0,2); root.add(balcony);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(16,0.9,0.18), new THREE.MeshStandardMaterial({ color:0x444455, roughness:0.75, metalness:0.2 }));
      rail.position.set(22,2.65,-3); root.add(rail);

      const caseBase = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.5,1.2), dark);
      for (let i=0;i<3;i++){
        const cb = caseBase.clone(); cb.position.set(-6+i*3.2,0.25,18); root.add(cb);
        const gb = new THREE.Mesh(new THREE.BoxGeometry(2.05,1.2,1.05), glass); gb.position.set(cb.position.x,1.0,cb.position.z); root.add(gb);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.1,1.2), neonBlue); glow.position.set(cb.position.x,1.65,cb.position.z); root.add(glow);
      }
      dwrite("[env] extras ready");
    })();

    // Teleport arch machine
    const arch = new THREE.Group();
    const archMat = new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0x111111, emissiveIntensity:0.35, roughness:0.35 });
    const pillarG = new THREE.BoxGeometry(0.4, 3.2, 0.4);
    const pL = new THREE.Mesh(pillarG, archMat); pL.position.set(-1.1, 1.6, 5.5);
    const pR = new THREE.Mesh(pillarG, archMat); pR.position.set( 1.1, 1.6, 5.5);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.8,0.35,0.45), archMat); top.position.set(0,3.25,5.5);
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.0,0.2,1.0), new THREE.MeshStandardMaterial({ color:0x111118, roughness:0.9 }));
    base.position.set(0,0.1,5.5);
    arch.add(pL,pR,top,base);
    root.add(arch);

    function setArchPower(on){
      archMat.emissive.setHex(on ? 0x2277ff : 0x111111);
      archMat.emissiveIntensity = on ? 1.25 : 0.35;
      archMat.needsUpdate = true;
    }

    // Teleport target ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.35,0.04,10,44),
      new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0x2aa3ff, emissiveIntensity:0.9, roughness:0.35 })
    );
    ring.rotation.x = Math.PI/2; ring.visible = false; root.add(ring);
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.06, 24),
      new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0x2aa3ff, emissiveIntensity:1.1, roughness:0.4 })
    );
    dot.rotation.x = -Math.PI/2; dot.position.y = 0.002; dot.visible = false; root.add(dot);

    // Training pit divot + rails + table
    const pit = new THREE.Group();
    pit.name = "trainingPit";
    const pitCenter = new THREE.Vector3(0,0,0);

    const pitRadius = 6.8;
    const pitDepth = 0.8;
    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 60),
      new THREE.MeshStandardMaterial({ color:0x0b0b12, roughness:0.95 }));
    pitFloor.rotation.x = -Math.PI/2;
    pitFloor.position.y = -pitDepth;
    pit.add(pitFloor);

    const rail = new THREE.Mesh(new THREE.TorusGeometry(pitRadius, 0.25, 18, 72),
      new THREE.MeshStandardMaterial({ color:0x2a1a10, roughness:0.55 }));
    rail.rotation.x = Math.PI/2;
    rail.position.y = 0.15;
    pit.add(rail);

    // Felt table
    const tableMat = new THREE.MeshStandardMaterial({ color:0x0b6b3a, roughness:0.85 });
    const table = new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,0.55, 48), tableMat);
    table.position.set(0, -pitDepth + 0.55, 0);
    pit.add(table);

    root.add(pit);
    dwrite("[divot] pit + rails + table ready");

    // Bots around training table (simple)
    const bots = new THREE.Group(); bots.name="bots";
    root.add(bots);
    const botMat = new THREE.MeshStandardMaterial({ color:0xbbaaff, roughness:0.75 });
    const headMat = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.6 });
    const seatR = 3.0;
    for (let i=0;i<5;i++){
      const g = new THREE.Group(); g.name="bot_"+i;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2,0.55,6,12), botMat); body.position.y = -pitDepth + 0.65;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17,16,12), headMat); head.position.y = -pitDepth + 1.05;
      g.add(body,head);
      const ang = (i/5)*Math.PI*2;
      g.position.set(Math.cos(ang)*seatR, 0, Math.sin(ang)*seatR);
      g.lookAt(0, -pitDepth+0.6, 0);
      bots.add(g);

      // two flat cards
      const backMat = new THREE.MeshStandardMaterial({ color:0x3333ff, roughness:0.7 });
      const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18,0.26), backMat);
      const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18,0.26), backMat);
      c1.rotation.x = -Math.PI/2; c2.rotation.x = -Math.PI/2;
      c1.position.set(g.position.x*0.55, -pitDepth+0.28, g.position.z*0.55);
      c2.position.set(g.position.x*0.55+0.22, -pitDepth+0.28, g.position.z*0.55);
      root.add(c1,c2);
    }
    dwrite("[bots] bots seated + cards ready");

    // VIP Room (no divot, 6-seat oval)
    const vip = new THREE.Group(); vip.name="vipRoom";
    const vipCenter = new THREE.Vector3(-16,0,-12);
    const vipFloor = new THREE.Mesh(new THREE.CircleGeometry(5.5, 48), new THREE.MeshStandardMaterial({ color:0x0c0c12, roughness:0.95 }));
    vipFloor.rotation.x = -Math.PI/2; vipFloor.position.copy(vipCenter); vip.add(vipFloor);
    const vipTableMat = new THREE.MeshStandardMaterial({ color:0x083f26, roughness:0.85 });
    const vipTable = new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,0.28,48), vipTableMat);
    vipTable.scale.x = 1.35; vipTable.position.set(vipCenter.x, vipCenter.y+0.65, vipCenter.z); vip.add(vipTable);
    const vipRim = new THREE.Mesh(new THREE.TorusGeometry(2.2,0.14,16,64), new THREE.MeshStandardMaterial({ color:0x2a1a10, roughness:0.6 }));
    vipRim.scale.x = 1.35; vipRim.rotation.x = Math.PI/2; vipRim.position.copy(vipTable.position); vipRim.position.y += 0.12; vip.add(vipRim);

    const vipBots = new THREE.Group(); vip.add(vipBots);
    const vipSeatR = 3.0;
    const angles = [];
    for (let i=0;i<6;i++) angles.push((i/6)*Math.PI*2);
    let bi=0;
    for (let i=0;i<6;i++){
      if (i===0) continue; // open seat
      const g = new THREE.Group(); g.name="vip_bot_"+bi++;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2,0.55,6,12), botMat); body.position.y = 0.65;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17,16,12), headMat); head.position.y = 1.05;
      g.add(body,head);
      g.position.set(vipCenter.x + Math.cos(angles[i])*vipSeatR, 0, vipCenter.z + Math.sin(angles[i])*vipSeatR);
      g.lookAt(vipCenter.x, 0.6, vipCenter.z);
      vipBots.add(g);
    }
    const openSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.08,18),
      new THREE.MeshStandardMaterial({ color:0x22ff22, emissive:0x22ff22, emissiveIntensity:0.4 }));
    openSeat.position.set(vipCenter.x + Math.cos(angles[0])*vipSeatR, 0.05, vipCenter.z + Math.sin(angles[0])*vipSeatR);
    vip.add(openSeat);
    root.add(vip);
    dwrite("[vip] room ready ✅");

    // Player avatar (torso + hands placeholder)
    const avatar = new THREE.Group(); avatar.name="playerAvatar";
    const bodyMat = new THREE.MeshStandardMaterial({ color:0x3bd6ff, roughness:0.75, metalness:0.05 });
    const accentMat = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.65, metalness:0.05 });
    const handMat = new THREE.MeshStandardMaterial({ color:0xffe0c8, roughness:0.85 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22,0.55,6,12), bodyMat);
    torso.position.set(0,0.92,0); avatar.add(torso);
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.10,0.22), accentMat);
    shoulders.position.set(0,1.18,0.05); avatar.add(shoulders);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.23,0.05,10,28), accentMat);
    belt.rotation.x = Math.PI/2; belt.position.set(0,0.70,0); avatar.add(belt);

    const handGeo = new THREE.BoxGeometry(0.09,0.05,0.13);
    const leftHand = new THREE.Mesh(handGeo, handMat); const rightHand = new THREE.Mesh(handGeo, handMat);
    avatar.add(leftHand,rightHand);

    rig.add(avatar);

    function updateAvatar(){
      const yaw = rig.rotation.y;
      const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
      const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
      const base = camera.position.clone();
      // camera is local in rig; convert to rig local directly
      const localBase = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
      const t = localBase.clone().add(forward.multiplyScalar(0.38));
      t.y -= 0.18;
      const l = t.clone().add(right.clone().multiplyScalar(-0.16));
      const r = t.clone().add(right.clone().multiplyScalar(0.16));
      leftHand.position.copy(l);
      rightHand.position.copy(r);
      leftHand.rotation.set(0,yaw,0);
      rightHand.rotation.set(0,yaw,0);
    }

    // Spawn pad
    const spawn = { pos: new THREE.Vector3(0,0,8), yaw: 0 };
    const spawnPad = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,0.1,24),
      new THREE.MeshStandardMaterial({ color:0xff3355, roughness:0.6 }));
    spawnPad.position.set(spawn.pos.x, 0.05, spawn.pos.z);
    root.add(spawnPad);

    function resetToSpawn(){
      rig.position.copy(spawn.pos);
      rig.rotation.set(0, spawn.yaw, 0);
      seated = false;
      btnJoinSeat.style.display = "none";
      btnLeaveSeat.style.display = "none";
      btnJoinSeat.textContent = "Join Seat";
      camera.position.y = 1.65;
      dwrite("[spawn] reset ✅");
    }
    btnReset.onclick = resetToSpawn;
    resetToSpawn();
    dwrite(`[spawn] rig set to (${rig.position.x.toFixed(2)},${rig.position.y.toFixed(2)},${rig.position.z.toFixed(2)})`);

    // Seat system (VIP open seat)
    const openSeatPos = new THREE.Vector3(vipCenter.x + vipSeatR, 0, vipCenter.z); // angle 0
    const openSeatYaw = Math.PI;
    let seated = false;
    let standPos = new THREE.Vector3().copy(rig.position);
    let standYaw = rig.rotation.y;

    function joinSeat(){
      standPos.copy(rig.position);
      standYaw = rig.rotation.y;
      rig.position.copy(openSeatPos);
      rig.rotation.set(0, openSeatYaw, 0);
      seated = true;
      camera.position.y = 1.25;
      btnJoinSeat.style.display = "none";
      btnLeaveSeat.style.display = "";
      cues.joinSeat();
      dwrite("[seat] joined VIP ✅");
      showPokerUI(true);
    }
    function leaveSeat(){
      rig.position.copy(standPos);
      rig.rotation.set(0, standYaw, 0);
      seated = false;
      camera.position.y = 1.65;
      btnJoinSeat.style.display = "none";
      btnLeaveSeat.style.display = "none";
      cues.standUp();
      dwrite("[seat] stood up ✅");
      showPokerUI(false);
    }
    btnJoinSeat.onclick = joinSeat;
    btnLeaveSeat.onclick = leaveSeat;

    // Poker UI (Android-first)
    const pokerWrap = document.createElement("div");
    pokerWrap.style.position="fixed";
    pokerWrap.style.left="12px";
    pokerWrap.style.bottom="12px";
    pokerWrap.style.zIndex="55";
    pokerWrap.style.display="none";
    pokerWrap.style.gap="8px";
    pokerWrap.style.flexWrap="wrap";
    pokerWrap.style.alignItems="center";
    pokerWrap.style.pointerEvents="auto";
    pokerWrap.style.display="none";
    pokerWrap.style.display="flex";
    pokerWrap.style.display="none";

    function mkBtn(txt){
      const b=document.createElement("button");
      b.className="hudBtn";
      b.textContent=txt;
      b.style.padding="12px 14px";
      return b;
    }
    const bCheck = mkBtn("Check/Call");
    const bBet = mkBtn("Bet +10");
    const bFold = mkBtn("Fold");
    pokerWrap.append(bCheck,bBet,bFold);
    document.body.appendChild(pokerWrap);

    let pot = 0;
    function showPokerUI(v){ pokerWrap.style.display = v ? "flex" : "none"; }
    bCheck.onclick = ()=>{ if(!seated) return; cues.chip(); dwrite("[poker] check/call"); };
    bBet.onclick = ()=>{ if(!seated) return; pot+=10; cues.chip(); dwrite(`[poker] bet +10 (pot=${pot})`); };
    bFold.onclick = ()=>{ if(!seated) return; dwrite("[poker] fold"); leaveSeat(); };

    // Teleport controls
    let teleportEnabled = false;
    btnTeleport.onclick = ()=>{
      teleportEnabled = !teleportEnabled;
      btnTeleport.textContent = teleportEnabled ? "Teleport: ON" : "Teleport: OFF";
      ring.visible = teleportEnabled;
      dot.visible = teleportEnabled;
      setArchPower(teleportEnabled);
    };

    const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    const ray = new THREE.Ray();
    const origin = new THREE.Vector3();
    const dirv = new THREE.Vector3();
    const hit = new THREE.Vector3();

    function getGroundHit(){
      camera.getWorldPosition(origin);
      camera.getWorldDirection(dirv);
      ray.origin.copy(origin);
      ray.direction.copy(dirv);
      const ok = ray.intersectPlane(groundPlane, hit);
      return ok ? hit.clone() : null;
    }

    async function fadeTeleport(to){
      const f = document.getElementById("fade");
      f.classList.add("on");
      await new Promise(r=>setTimeout(r, 90));
      rig.position.set(to.x, 0, to.z);
      await new Promise(r=>setTimeout(r, 90));
      f.classList.remove("on");
    }

    renderer.domElement.addEventListener("click", async ()=>{
      if (!teleportEnabled || seated) return;
      const p = getGroundHit();
      if (!p) return;
      cues.teleport();
      await fadeTeleport(p);
      dwrite(`[teleport] click -> (${p.x.toFixed(2)},${p.z.toFixed(2)})`);
    });

    // Touch + WASD movement (non-XR)
    const move = { active:false, startX:0,startY:0, yaw:0, pitch:0, px:0,pz:0 };
    const keys = {};
    window.addEventListener("keydown",(e)=>keys[e.key.toLowerCase()]=true);
    window.addEventListener("keyup",(e)=>keys[e.key.toLowerCase()]=false);

    function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

    renderer.domElement.addEventListener("touchstart",(e)=>{
      if (renderer.xr.isPresenting) return;
      if (!e.touches || e.touches.length===0) return;
      move.active = true;
      move.startX = e.touches[0].clientX;
      move.startY = e.touches[0].clientY;
      move.yaw = rig.rotation.y;
      move.pitch = camera.rotation.x;
      move.px = rig.position.x;
      move.pz = rig.position.z;
    }, { passive:true });

    renderer.domElement.addEventListener("touchmove",(e)=>{
      if (renderer.xr.isPresenting) return;
      if (!move.active) return;
      if (!e.touches || e.touches.length===0) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = (x - move.startX) / window.innerWidth;
      const dy = (y - move.startY) / window.innerHeight;

      // 1 finger = look
      if (e.touches.length === 1){
        rig.rotation.y = move.yaw - dx*3.2;
        camera.rotation.x = clamp(move.pitch - dy*2.4, -1.2, 1.2);
      }
      // 2 fingers = move
      if (e.touches.length >= 2){
        if (seated) return;
        const fwd = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
        const rightv = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
        const step = 6.0;
        const nx = move.px + (-dx*step)*rightv.x + (-dy*step)*fwd.x;
        const nz = move.pz + (-dx*step)*rightv.z + (-dy*step)*fwd.z;
        rig.position.x = nx;
        rig.position.z = nz;
      }
    }, { passive:true });

    renderer.domElement.addEventListener("touchend",()=>{ move.active=false; }, { passive:true });

    function updateMovement(dt){
      if (renderer.xr.isPresenting) return;
      if (seated) return;
      const speed = 3.6;
      const fwd = (keys["w"]?1:0) + (keys["arrowup"]?1:0) - (keys["s"]?1:0) - (keys["arrowdown"]?1:0);
      const str = (keys["d"]?1:0) + (keys["arrowright"]?1:0) - (keys["a"]?1:0) - (keys["arrowleft"]?1:0);
      if (!fwd && !str) return;
      const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
      const rightv = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), rig.rotation.y);
      rig.position.add(forward.multiplyScalar(fwd*speed*dt));
      rig.position.add(rightv.multiplyScalar(str*speed*dt));
    }

    // Apply textures AFTER build (safe)
    (function applyTextures(){
      try{
        const loader = new THREE.TextureLoader();
        const felt = loader.load("./assets/textures/felt.png");
        felt.wrapS = felt.wrapT = THREE.RepeatWrapping;
        felt.repeat.set(2,2);
        tableMat.map = felt; tableMat.needsUpdate = true;
        vipTableMat.map = felt; vipTableMat.needsUpdate = true;
        dwrite("[assets] textures applied ✅");
      }catch(e){
        dwrite("[assets] texture apply failed: " + (e?.message||e));
      }
    })();

    // Proximity join seat
    const tmp = new THREE.Vector3();
    function updateSeatPrompt(){
      if (seated){ btnJoinSeat.style.display="none"; btnLeaveSeat.style.display=""; return; }
      tmp.copy(rig.position);
      const d = tmp.distanceTo(openSeatPos);
      if (d <= 1.0){
        btnJoinSeat.style.display = "";
        btnJoinSeat.textContent = "Join Seat (VIP)";
        btnLeaveSeat.style.display = "none";
      } else {
        btnJoinSeat.style.display = "none";
        btnLeaveSeat.style.display = "none";
      }
    }

    // XR entry
    btnEnterVR.onclick = async ()=>{
      if (!navigator.xr){ dwrite("[xr] navigator.xr not available"); return; }
      try{
        const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures:["local-floor","bounded-floor","hand-tracking"] });
        await renderer.xr.setSession(session);
        dwrite("[xr] session started ✅");
      }catch(e){
        dwrite("[xr] failed: " + (e?.message||e));
      }
    };

    // Render loop
    let last = performance.now();
    renderer.setAnimationLoop(()=>{
      const now = performance.now();
      const dt = Math.min(0.05, (now-last)/1000);
      last = now;

      // update teleport ring position when enabled
      if (teleportEnabled && !seated){
        const p = getGroundHit();
        if (p){
          ring.position.set(p.x, 0.02, p.z);
          dot.position.set(p.x, 0.021, p.z);
        }
      }

      updateSeatPrompt();
      updateMovement(dt);
      updateAvatar();

      renderer.render(scene, camera);
    });

    dwrite("[main] ready ✅");
  }

  buildWorld();
})();