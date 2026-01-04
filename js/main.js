// js/main.js (classic script; NO modules)
// Requires three.min.js loaded first (index.html handles that)

(function () {
  const statusEl = document.getElementById("status");
  const chipsEl = document.getElementById("chips");
  const vrBtn = document.getElementById("vrBtn");
  const audioBtn = document.getElementById("audioBtn");

  const setStatus = (m) => { if (statusEl) statusEl.textContent = m; };

  // --- State ---
  let scene, camera, renderer;
  let raycaster, tmpVec3;
  let lobby = {};
  let chips = 10000;

  // Android look/move
  let yaw = 0, pitch = 0;
  let touchMode = "look";
  let lastX = 0, lastY = 0, lastTouchDist = null;

  // VR teleport
  let controller, controller2, teleportMarker, teleportLine;
  let lastTeleportValid = false;
  let teleportPoint = new THREE.Vector3();

  // Audio
  let listener, bgm, audioReady = false;

  // Interactables
  const interactables = []; // meshes with userData.onInteract

  try {
    boot();
    animate();
    setStatus("Lobby loaded ✅ (Android + Quest compatible)");
    updateChipsUI();
    setupVRButton();
    setupAndroidControls();
    setupInteractions();
    setupAudio();
  } catch (e) {
    console.error(e);
    setStatus("BOOT FAILED ❌\n" + (e?.message || String(e)));
  }

  function boot() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.Fog(0x020205, 10, 55);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 250);
    camera.position.set(0, 1.65, 6);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    tmpVec3 = new THREE.Vector3();

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 1.2);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(8, 14, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 60;
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
    scene.add(key);

    // Ceiling lights (warm)
    addCeilingLight(0, 7, 0);
    addCeilingLight(6, 7, -4);
    addCeilingLight(-6, 7, -4);

    // Build environment
    buildRoom();
    buildFloor();
    buildPokerTableAndChairs();
    buildStoreKioskAndButtons();
    buildTeleportHelpers();

    window.addEventListener("resize", onResize);
  }

  function addCeilingLight(x, y, z) {
    const p = new THREE.PointLight(0xfff2e0, 1.0, 25, 2);
    p.position.set(x, y, z);
    p.castShadow = false;
    scene.add(p);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfff2e0, emissive: 0xffe2b0, emissiveIntensity: 1.2 })
    );
    bulb.position.copy(p.position);
    scene.add(bulb);
  }

  function buildRoom() {
    // Solid room with an open "doorway" (front wall has a gap)
    const roomW = 22, roomH = 8, roomD = 22;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.95, metalness: 0.0 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.85 });

    // Back wall
    addBox(roomW, roomH, 0.4, 0, roomH/2, -roomD/2, wallMat, true);
    // Left
    addBox(0.4, roomH, roomD, -roomW/2, roomH/2, 0, wallMat, true);
    // Right
    addBox(0.4, roomH, roomD, roomW/2, roomH/2, 0, wallMat, true);

    // Front wall split into 3 parts to create a doorway
    const doorW = 5.5, doorH = 3.4;
    const sideW = (roomW - doorW) / 2;
    const topH = roomH - doorH;

    // Left front chunk
    addBox(sideW, roomH, 0.4, -(doorW/2 + sideW/2), roomH/2, roomD/2, wallMat, true);
    // Right front chunk
    addBox(sideW, roomH, 0.4, (doorW/2 + sideW/2), roomH/2, roomD/2, wallMat, true);
    // Top front chunk
    addBox(doorW, topH, 0.4, 0, doorH + topH/2, roomD/2, wallMat, true);

    // Ceiling
    addBox(roomW, 0.4, roomD, 0, roomH, 0, trimMat, true);

    // Base trim ring
    const baseTrim = new THREE.Mesh(
      new THREE.BoxGeometry(roomW - 0.2, 0.25, roomD - 0.2),
      trimMat
    );
    baseTrim.position.set(0, 0.12, 0);
    baseTrim.receiveShadow = true;
    scene.add(baseTrim);
  }

  function buildFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x2b2b2f, roughness: 1.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.userData.isTeleportFloor = true;
    scene.add(floor);

    // Simple carpet circle under table
    const carpet = new THREE.Mesh(
      new THREE.CircleGeometry(7.2, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 1.0 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.01;
    carpet.receiveShadow = true;
    scene.add(carpet);

    lobby.floor = floor;
    lobby.carpet = carpet;
  }

  function buildPokerTableAndChairs() {
    // Oval poker table (nice enough for now; can swap to GLTF later)
    const tableGroup = new THREE.Group();

    // Table top (oval)
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.3, 3.3, 0.25, 48, 1, false),
      new THREE.MeshStandardMaterial({ color: 0x0e4a2a, roughness: 0.95 })
    );
    top.scale.set(1.4, 1, 1.0); // make it oval
    top.position.set(0, 1.05, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    tableGroup.add(top);

    // Rail ring
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(4.65, 0.22, 18, 80),
      new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.7, metalness: 0.05 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(0, 1.12, 0);
    rail.scale.set(1.05, 1, 0.78);
    rail.castShadow = true;
    tableGroup.add(rail);

    // Leg
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 1.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.85 })
    );
    leg.position.set(0, 0.55, 0);
    leg.castShadow = true;
    tableGroup.add(leg);

    // Base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.8, 0.18, 32),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.9 })
    );
    base.position.set(0, 0.09, 0);
    base.receiveShadow = true;
    tableGroup.add(base);

    scene.add(tableGroup);
    lobby.table = tableGroup;

    // Chairs (6)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5f, roughness: 0.95 });
    const chairSeatMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3f, roughness: 0.98 });

    const radius = 6.0;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.sin(a) * radius;
      const z = Math.cos(a) * radius;

      const chair = buildChair(chairMat, chairSeatMat);
      chair.position.set(x, 0, z);
      chair.lookAt(0, 0, 0);
      chair.rotateY(Math.PI); // face table
      scene.add(chair);
    }
  }

  function buildChair(frameMat, seatMat) {
    const g = new THREE.Group();

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.12, 0.75),
      seatMat
    );
    seat.position.set(0, 0.55, 0);
    seat.castShadow = true;
    g.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.9, 0.12),
      seatMat
    );
    back.position.set(0, 1.05, -0.32);
    back.castShadow = true;
    g.add(back);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.55, 16),
      frameMat
    );
    base.position.set(0, 0.28, 0);
    base.castShadow = true;
    g.add(base);

    const feet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.06, 20),
      frameMat
    );
    feet.position.set(0, 0.03, 0);
    feet.receiveShadow = true;
    g.add(feet);

    return g;
  }

  function buildStoreKioskAndButtons() {
    // Kiosk stand
    const kiosk = new THREE.Group();

    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.9 })
    );
    stand.position.set(-8, 0.6, -6);
    stand.castShadow = true;
    kiosk.add(stand);

    // Screen with canvas text
    const screenTex = makeTextTexture("STORE", "Tap / Click", "Welcome!");
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.8),
      new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveIntensity: 0.4 })
    );
    screen.position.set(-8, 1.35, -5.7);
    screen.rotation.y = Math.PI * 0.1;
    kiosk.add(screen);

    // Chips button (physical)
    const chipBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.08, 28),
      new THREE.MeshStandardMaterial({ color: 0x8a2be2, roughness: 0.5 })
    );
    chipBtn.position.set(-8, 1.0, -5.7);
    chipBtn.rotation.x = Math.PI / 2;
    chipBtn.castShadow = true;

    chipBtn.userData.onInteract = () => {
      chips += 500;
      updateChipsUI();
      pulseMesh(chipBtn);
      setStatus("Chips added ✅ (+500)");
    };

    kiosk.add(chipBtn);

    scene.add(kiosk);

    interactables.push(screen, chipBtn, stand);
    lobby.kiosk = kiosk;
    lobby.chipBtn = chipBtn;
  }

  function makeTextTexture(line1, line2, line3) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0b0b10";
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, c.width - 24, c.height - 24);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px Arial";
    ctx.textAlign = "center";
    ctx.fillText(line1, c.width / 2, 95);

    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(line2, c.width / 2, 150);

    ctx.font = "24px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(line3, c.width / 2, 190);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  function buildTeleportHelpers() {
    teleportMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.28, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    teleportMarker.rotation.x = -Math.PI / 2;
    teleportMarker.position.set(0, 0.02, 0);
    teleportMarker.visible = false;
    scene.add(teleportMarker);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
    teleportLine = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.85 })
    );
    teleportLine.visible = false;
    scene.add(teleportLine);
  }

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

          setupVRControllers();

          session.addEventListener("end", () => {
            vrBtn.textContent = "ENTER VR";
            vrBtn.disabled = false;
            teleportMarker.visible = false;
            teleportLine.visible = false;
          });

          setStatus("VR Session started ✅ (Teleport enabled)");
          // VR click = allowed user gesture → safe to start audio
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

  function setupVRControllers() {
    controller = renderer.xr.getController(0);
    controller2 = renderer.xr.getController(1);

    controller.addEventListener("selectstart", onVRSelect);
    controller2.addEventListener("selectstart", onVRSelect);

    scene.add(controller);
    scene.add(controller2);
  }

  function onVRSelect() {
    // 1) If pointing at an interactable, interact.
    const hit = rayFromControllerToObjects(this, interactables);
    if (hit && hit.object && hit.object.userData && typeof hit.object.userData.onInteract === "function") {
      hit.object.userData.onInteract();
      return;
    }

    // 2) Else teleport if valid.
    if (lastTeleportValid) {
      // Move camera "rig" by shifting camera position on floor plane.
      camera.position.set(teleportPoint.x, camera.position.y, teleportPoint.z);
      setStatus("Teleported ✅");
    }
  }

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

    canvas.addEventListener("touchend", () => {
      lastTouchDist = null;
    }, { passive: true });
  }

  function setupInteractions() {
    // Tap to interact on Android
    renderer.domElement.addEventListener("click", () => {
      if (renderer.xr.isPresenting) return;
      tryStartAudio(); // user gesture on mobile

      // Ray from center of screen
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      const hits = raycaster.intersectObjects(interactables, true);
      if (hits.length) {
        const obj = hits[0].object;
        if (obj && obj.userData && typeof obj.userData.onInteract === "function") {
          obj.userData.onInteract();
        } else {
          setStatus("Tapped ✅");
        }
      }
    }, { passive: true });
  }

  function setupAudio() {
    listener = new THREE.AudioListener();
    camera.add(listener);

    bgm = new THREE.Audio(listener);
    const loader = new THREE.AudioLoader();

    // Preload (won’t play until user gesture)
    loader.load(
      "assets/audio/lobby_ambience.mp3",
      (buffer) => {
        bgm.setBuffer(buffer);
        bgm.setLoop(true);
        bgm.setVolume(0.35);
        audioReady = true;
        setStatus("Audio ready ✅ (Press Start Audio)");
      },
      undefined,
      () => {
        setStatus("Audio missing ❌ Put file at assets/audio/lobby_ambience.mp3");
      }
    );

    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        tryStartAudio(true);
      });
    }
  }

  function tryStartAudio(force) {
    if (!bgm || !audioReady) return;
    if (bgm.isPlaying) return;

    // mobile + quest require user gesture — this runs only from click/tap
    try {
      bgm.play();
      if (audioBtn) audioBtn.textContent = "Audio Playing ✅";
      setStatus("Audio playing ✅");
    } catch (e) {
      if (force) setStatus("Audio blocked by browser ❌ Tap again");
    }
  }

  function animate() {
    renderer.setAnimationLoop(() => {
      // 2D camera orientation
      if (!renderer.xr.isPresenting) {
        camera.rotation.order = "YXZ";
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
      }

      // Teleport reticle update in VR
      if (renderer.xr.isPresenting && controller) {
        updateTeleportRay(controller);
      }

      renderer.render(scene, camera);
    });
  }

  function updateTeleportRay(ctrl) {
    const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(ctrl.quaternion).normalize();

    raycaster.set(origin, direction);
    const hits = raycaster.intersectObject(lobby.floor, true);

    if (hits.length) {
      teleportPoint.copy(hits[0].point);
      teleportPoint.y = 0;

      teleportMarker.visible = true;
      teleportMarker.position.set(teleportPoint.x, 0.02, teleportPoint.z);

      teleportLine.visible = true;
      const p1 = origin.clone();
      const p2 = hits[0].point.clone();
      teleportLine.geometry.setFromPoints([p1, p2]);

      lastTeleportValid = true;
    } else {
      teleportMarker.visible = false;
      teleportLine.visible = false;
      lastTeleportValid = false;
    }
  }

  function rayFromControllerToObjects(ctrl, objects) {
    const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(ctrl.quaternion).normalize();
    raycaster.set(origin, direction);
    const hits = raycaster.intersectObjects(objects, true);
    return hits.length ? hits[0] : null;
  }

  function updateChipsUI() {
    if (chipsEl) chipsEl.textContent = "Chips: " + chips.toLocaleString();
  }

  function pulseMesh(mesh) {
    if (!mesh) return;
    const s0 = mesh.scale.clone();
    mesh.scale.multiplyScalar(1.18);
    setTimeout(() => mesh.scale.copy(s0), 120);
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
