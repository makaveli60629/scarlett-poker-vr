// js/main.js (classic script - no ES modules)
// Requires three.min.js loaded first (done in index.html)

(function () {
  const statusEl = document.getElementById("status");
  const vrBtn = document.getElementById("vrBtn");
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

  let scene, camera, renderer;
  let yaw = 0, pitch = 0;
  let touchMode = "look";
  let lastTouchDist = null;

  // --- Boot safely ---
  try {
    boot();
    animate();
    setStatus("Boot OK ✅ (Android 2D ready; VR button will enable on Quest.)");
    setupVRButton();
    setupAndroidTouchControls();
  } catch (e) {
    console.error(e);
    setStatus("BOOT FAILED ❌\n" + (e && e.message ? e.message : String(e)));
  }

  function boot() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);

    // Camera
    camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(0, 1.6, 4);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.xr.enabled = true;

    document.body.appendChild(renderer.domElement);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.6);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 10, 4);
    scene.add(dir);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 1.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Spawn marker
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.02, 28),
      new THREE.MeshStandardMaterial({ color: 0x777777 })
    );
    marker.position.set(0, 0.01, 0);
    scene.add(marker);

    // Reference box
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x555555 })
    );
    box.position.set(0, 0.25, -1.6);
    scene.add(box);

    window.addEventListener("resize", onResize);
  }

  function animate() {
    renderer.setAnimationLoop(() => {
      // Apply yaw/pitch in 2D mode (Quest VR overrides camera automatically)
      if (!renderer.xr.isPresenting) {
        camera.rotation.order = "YXZ";
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
      }
      renderer.render(scene, camera);
    });
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // --- VR Button (built-in, no VRButton import) ---
  async function setupVRButton() {
    if (!vrBtn) return;

    vrBtn.disabled = true;
    vrBtn.textContent = "Checking VR…";

    if (!("xr" in navigator)) {
      vrBtn.textContent = "VR Not Supported";
      vrBtn.disabled = true;
      return;
    }

    try {
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
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

          session.addEventListener("end", () => {
            vrBtn.textContent = "ENTER VR";
            vrBtn.disabled = false;
          });

          // If audio exists later, it must be started from a user gesture like this click.
          setStatus("VR Session started ✅ (Quest Browser)");
        } catch (e) {
          console.error(e);
          setStatus("VR Start Failed ❌\n" + (e && e.message ? e.message : String(e)));
          vrBtn.textContent = "ENTER VR";
          vrBtn.disabled = false;
        }
      });
    } catch (e) {
      console.error(e);
      vrBtn.textContent = "VR Check Failed";
      vrBtn.disabled = true;
    }
  }

  // --- Android touch controls (simple but effective) ---
  function setupAndroidTouchControls() {
    const canvas = renderer.domElement;
    let lastX = 0, lastY = 0;
    let moving = false;

    // One-finger = look, two-finger = move
    canvas.addEventListener("touchstart", (ev) => {
      if (!ev.touches || ev.touches.length === 0) return;

      if (ev.touches.length === 1) {
        touchMode = "look";
        lastX = ev.touches[0].clientX;
        lastY = ev.touches[0].clientY;
      } else if (ev.touches.length === 2) {
        touchMode = "move";
        moving = true;
        lastTouchDist = touchDistance(ev.touches[0], ev.touches[1]);
        lastX = (ev.touches[0].clientX + ev.touches[1].clientX) * 0.5;
        lastY = (ev.touches[0].clientY + ev.touches[1].clientY) * 0.5;
      }
    }, { passive: true });

    canvas.addEventListener("touchmove", (ev) => {
      if (!ev.touches || ev.touches.length === 0) return;

      if (!renderer.xr.isPresenting) {
        if (touchMode === "look" && ev.touches.length === 1) {
          const x = ev.touches[0].clientX;
          const y = ev.touches[0].clientY;
          const dx = x - lastX;
          const dy = y - lastY;
          lastX = x; lastY = y;

          yaw -= dx * 0.005;
          pitch -= dy * 0.005;
          pitch = Math.max(-1.2, Math.min(1.2, pitch));
        }

        if (touchMode === "move" && ev.touches.length === 2) {
          const cx = (ev.touches[0].clientX + ev.touches[1].clientX) * 0.5;
          const cy = (ev.touches[0].clientY + ev.touches[1].clientY) * 0.5;

          const dx = cx - lastX;
          const dy = cy - lastY;
          lastX = cx; lastY = cy;

          // Move relative to yaw
          const forward = -dy * 0.01;
          const strafe = dx * 0.01;

          const dir = new THREE.Vector3(
            Math.sin(yaw),
            0,
            Math.cos(yaw)
          );

          const right = new THREE.Vector3(
            Math.sin(yaw + Math.PI / 2),
            0,
            Math.cos(yaw + Math.PI / 2)
          );

          camera.position.addScaledVector(dir, forward);
          camera.position.addScaledVector(right, strafe);

          // Pinch to move forward/back slightly
          const dist = touchDistance(ev.touches[0], ev.touches[1]);
          if (lastTouchDist != null) {
            const pinch = (dist - lastTouchDist) * 0.002;
            camera.position.addScaledVector(dir, -pinch);
          }
          lastTouchDist = dist;
        }
      }
    }, { passive: true });

    canvas.addEventListener("touchend", () => {
      moving = false;
      lastTouchDist = null;
    }, { passive: true });
  }

  function touchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
})();
