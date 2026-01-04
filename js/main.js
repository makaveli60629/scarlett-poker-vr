// js/main.js (classic script; NO modules; Android + Quest + GitHub Pages)
(function () {
  // UI
  const statusEl = document.getElementById("status");
  const chipsEl = document.getElementById("chips");
  const ownedEl = document.getElementById("owned");
  const vrBtn = document.getElementById("vrBtn");
  const audioBtn = document.getElementById("audioBtn");

  const setStatus = (m) => { if (statusEl) statusEl.textContent = m; };

  // State
  let scene, camera, renderer, raycaster;
  let chips = 10000;
  const owned = new Set();

  // Android camera control
  let yaw = 0, pitch = 0;
  let touchMode = "look";
  let lastX = 0, lastY = 0, lastTouchDist = null;

  // Audio
  let listener, bgm, audioReady = false;

  // Interactables
  const interactables = [];

  // Floor + teleport
  let floorMesh;
  let teleportMarker, teleportLine;
  let lastTeleportValid = false;
  const teleportPoint = new THREE.Vector3();

  // VR controllers + laser UI
  let controller0 = null, controller1 = null;
  let laser0 = null, laser1 = null;
  let reticle0 = null, reticle1 = null;

  try {
    boot();
    animate();
    setStatus("Lobby loaded ✅ (Store + Laser UI + Teleport)");
    updateHud();
    setupVRButton();
    setupAndroidControls();
    setupPointerInteractions();
    setupAudio();
  } catch (e) {
    console.error(e);
    setStatus("BOOT FAILED ❌\n" + (e?.message || String(e)));
  }

  // ---------- BOOT ----------
  function boot() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.Fog(0x020205, 10, 60);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 250);
    camera.position.set(0, 1.65, 7);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();

    // Lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x202030, 1.1));

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(10, 14, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 80;
    key.shadow.camera.left = -25;
    key.shadow.camera.right = 25;
    key.shadow.camera.top = 25;
    key.shadow.camera.bottom = -25;
    scene.add(key);

    addCeilingLight(0, 7, 0);
    addCeilingLight(6, 7, -4);
    addCeilingLight(-6, 7, -4);

    buildRoom();
    buildFloor();
    buildPokerTableAndChairs();
    buildStorePanel();
    buildTeleportHelpers();

    window.addEventListener("resize", onResize);
  }

  function addCeilingLight(x, y, z) {
    const p = new THREE.PointLight(0xfff2e0, 1.0, 28, 2);
    p.position.set(x, y, z);
    scene.add(p);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfff2e0, emissive: 0xffe2b0, emissiveIntensity: 1.2 })
    );
    bulb.position.copy(p.position);
    scene.add(bulb);
  }

  // ---------- ENV ----------
  function buildRoom() {
    const roomW = 22, roomH = 8, roomD = 22;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.95 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.85 });

    // Back / left / right
    addBox(roomW, roomH, 0.4, 0, roomH/2, -roomD/2, wallMat, true);
    addBox(0.4, roomH, roomD, -roomW/2, roomH/2, 0, wallMat, true);
    addBox(0.4, roomH, roomD, roomW/2, roomH/2, 0, wallMat, true);

    // Front with doorway
    const doorW = 5.5, doorH = 3.4;
    const sideW = (roomW - doorW) / 2;
    const topH = roomH - doorH;

    addBox(sideW, roomH, 0.4, -(doorW/2 + sideW/2), roomH/2, roomD/2, wallMat, true);
    addBox(sideW, roomH, 0.4, (doorW/2 + sideW/2), roomH/2, roomD/2, wallMat, true);
    addBox(doorW, topH, 0.4, 0, doorH + topH/2, roomD/2, wallMat, true);

    // Ceiling
    addBox(roomW, 0.4, roomD, 0, roomH, 0, trimMat, true);

    // Base trim
    const baseTrim = new THREE.Mesh(
      new THREE.BoxGeometry(roomW - 0.2, 0.25, roomD - 0.2),
      trimMat
    );
    baseTrim.position.set(0, 0.12, 0);
    baseTrim.receiveShadow = true;
    scene.add(baseTrim);
  }

  function buildFloor() {
    floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({ color: 0x2b2b2f, roughness: 1.0 })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const carpet = new THREE.Mesh(
      new THREE.CircleGeometry(7.2, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 1.0 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.01;
    carpet.receiveShadow = true;
    scene.add(carpet);
  }

  function buildPokerTableAndChairs() {
    const tableGroup = new THREE.Group();

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.3, 3.3, 0.25, 48),
      new THREE.MeshStandardMaterial({ color: 0x0e4a2a, roughness: 0.95 })
    );
    top.scale.set(1.4, 1, 1.0);
    top.position.set(0, 1.05, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    tableGroup.add(top);

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(4.65, 0.22, 18, 80),
      new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.7, metalness: 0.05 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(0, 1.12, 0);
    rail.scale.set(1.05, 1, 0.78);
    rail.castShadow = true;
    tableGroup.add(rail);

    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 1.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.85 })
    );
    leg.position.set(0, 0.55, 0);
    leg.castShadow = true;
    tableGroup.add(leg);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.8, 0.18, 32),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.9 })
    );
    base.position.set(0, 0.09, 0);
    base.receiveShadow = true;
    tableGroup.add(base);

    scene.add(tableGroup);

    const chairFrame = new THREE.MeshStandardMaterial({ color: 0x5a5a5f, roughness: 0.95 });
    const chairSeat = new THREE.MeshStandardMaterial({ color: 0x3a3a3f, roughness: 0.98 });

    const radius = 6.0;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.sin(a) * radius;
      const z = Math.cos(a) * radius;
      const chair = buildChair(chairFrame, chairSeat);
      chair.position.set(x, 0, z);
      chair.lookAt(0, 0, 0);
      chair.rotateY(Math.PI);
      scene.add(chair);
    }
  }

  function buildChair(frameMat, seatMat) {
    const g = new THREE.Group();

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.75), seatMat);
    seat.position.set(0, 0.55, 0);
    seat.castShadow = true;
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.12), seatMat);
    back.position.set(0, 1.05, -0.32);
    back.castShadow = true;
    g.add(back);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.55, 16), frameMat);
    post.position.set(0, 0.28, 0);
    post.castShadow = true;
    g.add(post);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 20), frameMat);
    base.position.set(0, 0.03, 0);
    base.receiveShadow = true;
    g.add(base);

    return g;
  }

  // ---------- STORE PANEL (IN-WORLD UI) ----------
  function buildStorePanel() {
    const panel = new THREE.Group();
    panel.position.set(-8.5, 1.4, -4.8);
    panel.rotation.y = Math.PI * 0.15;

    const bgTex = makePanelTexture("TEAM NOVA STORE", "Aim laser + trigger (VR)", "Tap to buy (Android)");
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 1.35),
      new THREE.MeshStandardMaterial({ map: bgTex, emissive: 0xffffff, emissiveIntensity: 0.35 })
    );
    panel.add(bg);

    // Buttons (as meshes)
    const buttons = [
      mkButton("+500 CHIPS", 0x8a2be2, () => addChips(500), 0.0, 0.25),
      mkButton("BUY HAT -1000", 0x2b6cff, () => buyItem("Hat", 1000), 0.0, -0.05),
      mkButton("BUY HOODIE -2500", 0x00b894, () => buyItem("Hoodie", 2500), 0.0, -0.35),
      mkButton("RESET COSMETICS", 0xff7a00, () => resetCosmetics(), 0.0, -0.65),
    ];

    buttons.forEach(b => panel.add(b.mesh));
    scene.add(panel);

    // Add to interactables (VR laser + Android tap)
    buttons.forEach(b => interactables.push(b.mesh));
    interactables.push(bg);
  }

  function mkButton(label, color, onClick, x, y) {
    const w = 1.9, h = 0.18;
    const tex = makeButtonTexture(label);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.15,
        transparent: true
      })
    );
    mesh.position.set(x, y, 0.02);
    mesh.userData.onInteract = () => {
      pulse(mesh);
      onClick();
    };
    mesh.userData.isUIButton = true;
    mesh.userData.baseColor = color;
    return { mesh };
  }

  function makePanelTexture(line1, line2, line3) {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0b0b10";
    ctx.fillRect(0, 0, c.width, c.height);

    // frame
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, c.width - 36, c.height - 36);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.fillText(line1, c.width / 2, 140);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 36px Arial";
    ctx.fillText(line2, c.width / 2, 240);

    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "32px Arial";
    ctx.fillText(line3, c.width / 2, 300);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  function makeButtonTexture(label) {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 128;
    const ctx = c.getContext("2d");

    // base
    ctx.fillStyle = "#141418";
    ctx.fillRect(0, 0, c.width, c.height);

    // gradient-ish highlight
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, "rgba(255,255,255,0.10)");
    g.addColorStop(1, "rgba(255,255,255,0.02)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);

    // border
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, c.width - 20, c.height - 20);

    // text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, c.width / 2, c.height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  // ---------- TELEPORT HELPERS ----------
  function buildTeleportHelpers() {
    teleportMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.28, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    teleportMarker.rotation.x = -Math.PI / 2;
    teleportMarker.position.set(0, 0.02, 0);
    teleportMarker.visible = false;
    scene.add(teleportMarker);

    teleportLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.85 })
    );
    teleportLine.visible = false;
    scene.add(teleportLine);
  }

  // ---------- VR BUTTON + CONTROLLERS ----------
  function setupVRButton() {
    if (!vrBtn) return;

    vrBtn.disabled = true;
    vrBtn.textContent = "Checking VR…";

    if (!("xr" in navigator)) {
      vrBtn.textContent = "VR Not Supported";
      vrBtn.disabled = true;
      return;
    }

    navigator.xr.isSessionSupported("immersive-vr").then((ok) => {
      if (!ok) {
        vrBtn.textContent = "VR Not Supported";
        vrBtn.disabled = true;
        return;
      }

      vrBtn.textContent = "ENTER VR";
      vrBtn.disabled = false;

      vrBtn.addEventListener("click", async () => {
        try {
          vrBtn.disabled = true;
          vrBtn.textContent = "Starting VR…";

          const session = await navigator.xr.requestSession("immersive-vr", {
            optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"]
          });

          renderer.xr.setReferenceSpaceType("local-floor");
          await renderer.xr.setSession(session);

          setupControllers();

          session.addEventListener("end", () => {
            vrBtn.textContent = "ENTER VR";
            vrBtn.disabled = false;
            hideTeleport();
            hideLaser();
          });

          setStatus("VR Session started ✅ (Laser UI + Teleport enabled)");
          tryStartAudio();
        } catch (e) {
          console.error(e);
          setStatus("VR Start Failed ❌\n" + (e?.message || String(e)));
          vrBtn.textContent = "ENTER VR";
          vrBtn.disabled = false;
        }
      });
    }).catch(() => {
      vrBtn.textContent = "VR Check Failed";
      vrBtn.disabled = true;
    });
  }

  function setupControllers() {
    controller0 = renderer.xr.getController(0);
    controller1 = renderer.xr.getController(1);

    controller0.addEventListener("selectstart", () => onVRSelect(controller0));
    controller1.addEventListener("selectstart", () => onVRSelect(controller1));

    scene.add(controller0);
    scene.add(controller1);

    // Laser visuals
    laser0 = makeLaser();
    laser1 = makeLaser();
    controller0.add(laser0);
    controller1.add(laser1);

    reticle0 = makeReticle();
    reticle1 = makeReticle();
    scene.add(reticle0);
    scene.add(reticle1);
  }

  function makeLaser() {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    line.name = "laser";
    line.scale.z = 8; // default length
    return line;
  }

  function makeReticle() {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.01, 0.018, 24),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    return m;
  }

  function hideLaser() {
    if (reticle0) reticle0.visible = false;
    if (reticle1) reticle1.visible = false;
  }

  // ---------- VR SELECT (UI first, else teleport) ----------
  function onVRSelect(ctrl) {
    const hitUI = rayFromController(ctrl, interactables);
    if (hitUI && hitUI.object && hitUI.object.userData && typeof hitUI.object.userData.onInteract === "function") {
      hitUI.object.userData.onInteract();
      setStatus("Store action ✅");
      return;
    }

    if (lastTeleportValid) {
      camera.position.set(teleportPoint.x, camera.position.y, teleportPoint.z);
      setStatus("Teleported ✅");
    }
  }

  // ---------- ANDROID CONTROLS ----------
  function setupAndroidControls() {
    const canvas = renderer.domElement;

    canvas.addEventListener("touchstart", (ev) => {
      if (!ev.touches || ev.touches.length === 0) return;
      if (ev.touches.length === 1) {
        touchMode = "look";
        lastX = ev.touches[0].clientX;
        lastY = ev.touches[0].clientY;
      } else if (ev.touches.length === 2) {
        touchMode = "move";
        lastTouchDist = touchDistance(ev.touches[0], ev.touches[1]);
        lastX = (ev.touches[0].clientX + ev.touches[1].clientX) * 0.5;
        lastY = (ev.touches[0].clientY + ev.touches[1].clientY) * 0.5;
      }
    }, { passive: true });

    canvas.addEventListener("touchmove", (ev) => {
      if (!ev.touches || ev.touches.length === 0) return;
      if (renderer.xr.isPresenting) return;

      if (touchMode === "look" && ev.touches.length === 1) {
        const x = ev.touches[0].clientX;
        const y = ev.touches[0].clientY;
        const dx = x - lastX;
        const dy = y - lastY;
        lastX = x; lastY = y;

        yaw -= dx * 0.005;
        pitch -= dy * 0.005;
        pitch = Math.max(-1.15, Math.min(1.15, pitch));
      }

      if (touchMode === "move" && ev.touches.length === 2) {
        const cx = (ev.touches[0].clientX + ev.touches[1].clientX) * 0.5;
        const cy = (ev.touches[0].clientY + ev.touches[1].clientY) * 0.5;

        const dx = cx - lastX;
        const dy = cy - lastY;
        lastX = cx; lastY = cy;

        const forward = -dy * 0.01;
        const strafe = dx * 0.01;

        const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

        camera.position.addScaledVector(dir, forward);
        camera.position.addScaledVector(right, strafe);

        const dist = touchDistance(ev.touches[0], ev.touches[1]);
        if (lastTouchDist != null) {
          const pinch = (dist - lastTouchDist) * 0.002;
          camera.position.addScaledVector(dir, -pinch);
        }
        lastTouchDist = dist;
      }
    }, { passive: true });

    // Tap to interact (ray from center of screen)
    canvas.addEventListener("click", () => {
      if (renderer.xr.isPresenting) return;
      tryStartAudio();
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      const hits = raycaster.intersectObjects(interactables, true);
      if (hits.length) {
        const obj = hits[0].object;
        if (obj.userData && typeof obj.userData.onInteract === "function") obj.userData.onInteract();
      }
    }, { passive: true });
  }

  // ---------- POINTER INTERACTION + AUDIO ----------
  function setupPointerInteractions() {
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        tryStartAudio(true);
      });
    }
  }

  function setupAudio() {
    listener = new THREE.AudioListener();
    camera.add(listener);

    bgm = new THREE.Audio(listener);
    const loader = new THREE.AudioLoader();

    loader.load(
      "assets/audio/lobby_ambience.mp3",
      (buffer) => {
        bgm.setBuffer(buffer);
        bgm.setLoop(true);
        bgm.setVolume(0.35);
        audioReady = true;
        setStatus("Audio ready ✅ (Tap Start Audio)");
      },
      undefined,
      () => setStatus("Audio missing ❌ Put file at assets/audio/lobby_ambience.mp3")
    );
  }

  function tryStartAudio(force) {
    if (!bgm || !audioReady) return;
    if (bgm.isPlaying) return;
    try {
      bgm.play();
      if (audioBtn) audioBtn.textContent = "Audio Playing ✅";
      setStatus("Audio playing ✅");
    } catch (e) {
      if (force) setStatus("Audio blocked by browser ❌ Tap again");
    }
  }

  // ---------- GAME LOOP ----------
  function animate() {
    renderer.setAnimationLoop(() => {
      // 2D camera rotation
      if (!renderer.xr.isPresenting) {
        camera.rotation.order = "YXZ";
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
      }

      // VR: update laser + reticle + teleport ray
      if (renderer.xr.isPresenting) {
        updateControllerRay(controller0, laser0, reticle0);
        updateControllerRay(controller1, laser1, reticle1);
      }

      renderer.render(scene, camera);
    });
  }

  function updateControllerRay(ctrl, laser, reticle) {
    if (!ctrl || !laser) return;

    const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(ctrl.quaternion).normalize();

    // 1) UI hit
    raycaster.set(origin, direction);
    const uiHits = raycaster.intersectObjects(interactables, true);
    if (uiHits.length) {
      const p = uiHits[0].point;
      laser.scale.z = Math.max(0.5, origin.distanceTo(p));
      if (reticle) {
        reticle.visible = true;
        reticle.position.set(p.x, p.y, p.z);
      }
      // Hide teleport markers when aiming at UI
      hideTeleport();
      return;
    } else {
      if (reticle) reticle.visible = false;
    }

    // 2) Teleport hit on floor
    const floorHit = raycaster.intersectObject(floorMesh, true);
    if (floorHit.length) {
      teleportPoint.copy(floorHit[0].point);
      teleportPoint.y = 0;

      showTeleport(origin, floorHit[0].point);
      laser.scale.z = Math.max(0.5, origin.distanceTo(floorHit[0].point));

      lastTeleportValid = true;
    } else {
      hideTeleport();
      lastTeleportValid = false;
      laser.scale.z = 8;
    }
  }

  function showTeleport(origin, hitPoint) {
    teleportMarker.visible = true;
    teleportMarker.position.set(teleportPoint.x, 0.02, teleportPoint.z);

    teleportLine.visible = true;
    teleportLine.geometry.setFromPoints([origin.clone(), hitPoint.clone()]);
  }

  function hideTeleport() {
    if (teleportMarker) teleportMarker.visible = false;
    if (teleportLine) teleportLine.visible = false;
  }

  function rayFromController(ctrl, objects) {
    const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(ctrl.quaternion).normalize();
    raycaster.set(origin, direction);
    const hits = raycaster.intersectObjects(objects, true);
    return hits.length ? hits[0] : null;
  }

  // ---------- STORE ACTIONS ----------
  function addChips(amount) {
    chips += amount;
    updateHud();
    setStatus(`Chips +${amount} ✅`);
  }

  function buyItem(name, cost) {
    if (owned.has(name)) {
      setStatus(`${name} already owned ✅`);
      return;
    }
    if (chips < cost) {
      setStatus(`Not enough chips ❌ Need ${cost.toLocaleString()}`);
      return;
    }
    chips -= cost;
    owned.add(name);
    updateHud();
    setStatus(`Purchased ${name} ✅`);
  }

  function resetCosmetics() {
    owned.clear();
    updateHud();
    setStatus("Cosmetics reset ✅");
  }

  function updateHud() {
    if (chipsEl) chipsEl.textContent = "Chips: " + chips.toLocaleString();
    if (ownedEl) ownedEl.textContent = "Owned: " + (owned.size ? Array.from(owned).join(", ") : "(none)");
  }

  // ---------- UTIL ----------
  function pulse(mesh) {
    const s0 = mesh.scale.clone();
    mesh.scale.multiplyScalar(1.06);
    setTimeout(() => mesh.scale.copy(s0), 100);
  }

  function addBox(w, h, d, x, y, z, mat, receiveShadow) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = !!receiveShadow;
    scene.add(m);
    return m;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function touchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
})();
