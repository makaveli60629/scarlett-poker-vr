// /js/teleport_machine.js — Scarlett Teleport Machine (HARDENED) v3.0 (FULL)
// ✅ Decorative machine (your original) + REAL teleport pads
// ✅ Works with: onHit(id) OR ctx.onTeleportHit(id)
// ✅ Controller ray OR gaze fallback
// ✅ Trigger/select/click to activate

export const TeleportMachine = {
  init(ctx = {}) {
    const THREE = ctx.THREE || globalThis.THREE;
    const scene = ctx.scene;
    const renderer = ctx.renderer;
    const camera = ctx.camera;
    const player = ctx.player;
    const controllers = ctx.controllers;
    const log = ctx.log || console.log;

    // Harden: accept ctx.world OR ctx OR ctx.worldBuilder shapes
    const worldObj =
      ctx.world ||
      ctx?.ctx?.world ||
      ctx?.worldObj ||
      {};

    // Guaranteed mount:
    const mount =
      worldObj.mount ||
      ctx.mount ||
      ((obj) => {
        if (scene && obj?.isObject3D) scene.add(obj);
      });

    if (!worldObj.mount) worldObj.mount = mount;
    ctx.world = worldObj;

    if (!THREE || !scene) {
      log("[teleport_machine] missing THREE/scene, abort");
      return;
    }

    // ---------- root ----------
    const root = new THREE.Group();
    root.name = "TeleportMachine";
    root.position.set(-10, 0, 10); // visible corner
    mount(root);

    // ---------- decorative machine (kept from v2.0) ----------
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.35, 36),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.55, metalness: 0.25 })
    );
    base.position.y = 0.18;
    root.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.08, 16, 64),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        roughness: 0.25,
        metalness: 0.55,
        emissive: 0x003344,
        emissiveIntensity: 0.9,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    root.add(ring);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 2.0, 24),
      new THREE.MeshStandardMaterial({ color: 0x10142a, roughness: 0.4, metalness: 0.35 })
    );
    pillar.position.y = 1.25;
    root.add(pillar);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xff2d7a })
    );
    core.position.y = 2.3;
    root.add(core);

    const light = new THREE.PointLight(0x7fe7ff, 1.8, 18);
    light.position.set(0, 2.2, 0);
    root.add(light);

    // Register a spawn you can teleport to later (optional)
    if (ctx.addSpawn && THREE.Vector3) {
      ctx.addSpawn("teleport_machine", root.position.clone().add(new THREE.Vector3(0, 0, 3)), Math.PI);
    }

    // ---------- Pads ----------
    // Accept pads from init call (preferred), else create defaults:
    const pads = Array.isArray(ctx.pads) && ctx.pads.length ? ctx.pads : [
      { id: "tp_store", label: "STORE", pos: new THREE.Vector3(-4.0, 0.01, -1.0) },
      { id: "tp_scorpion", label: "SCORPION ROOM", pos: new THREE.Vector3(4.0, 0.01, -1.0) },
      { id: "tp_lobby", label: "LOBBY", pos: new THREE.Vector3(0.0, 0.01, 3.2) },
    ];

    const padGroup = new THREE.Group();
    padGroup.name = "TeleportPads";
    mount(padGroup);

    const interactables = [];

    const makeLabelTex = (text) => {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "rgba(5,6,10,0.72)";
      g.fillRect(0, 0, c.width, c.height);
      g.strokeStyle = "rgba(127,231,255,0.85)";
      g.lineWidth = 10;
      g.strokeRect(10, 10, c.width - 20, c.height - 20);
      g.fillStyle = "#e8ecff";
      g.font = "bold 64px system-ui, Arial";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, c.width / 2, c.height / 2);
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    };

    const makePad = (p) => {
      const g = new THREE.Group();
      g.name = `Pad_${p.id}`;
      g.userData.tpId = p.id;

      // ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.55, 48),
        new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      ring.userData.tpId = p.id;
      g.add(ring);

      // invisible hit disc (bigger)
      const hit = new THREE.Mesh(
        new THREE.CircleGeometry(0.65, 32),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide })
      );
      hit.rotation.x = -Math.PI / 2;
      hit.position.y = 0.021;
      hit.userData.tpId = p.id;
      g.add(hit);

      // label
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(1.45, 0.72),
        new THREE.MeshBasicMaterial({ map: makeLabelTex(p.label || p.id), transparent: true })
      );
      label.position.y = 1.15;
      label.userData.tpId = p.id;
      g.add(label);

      g.position.copy(p.pos);
      padGroup.add(g);

      interactables.push(hit, ring, label);
      return { group: g, ring, hit, label };
    };

    const padObjs = pads.map(makePad);

    // ---------- Interaction (raycast + activate) ----------
    const raycaster = new THREE.Raycaster();
    const tempMat = new THREE.Matrix4();
    const tempDir = new THREE.Vector3();
    const tempPos = new THREE.Vector3();

    let hovered = null;
    let hoverT = 0;

    const setHovered = (obj) => {
      if (hovered === obj) return;
      hovered = obj;
      hoverT = 0;
    };

    const activate = (id) => {
      if (!id) return;
      log(`[teleport_machine] activate → ${id}`);

      // Preferred callback passed into init:
      if (typeof ctx.onHit === "function") {
        try { ctx.onHit(id); } catch {}
      }

      // RoomManager wiring uses ctx.onTeleportHit:
      if (typeof ctx.onTeleportHit === "function") {
        try { ctx.onTeleportHit(id); } catch {}
      }

      // Also support custom event bus:
      window.dispatchEvent(new CustomEvent("scarlett-teleport", { detail: { id } }));
    };

    const castFromController = (ctrl) => {
      if (!ctrl?.isObject3D) return null;
      tempMat.identity().extractRotation(ctrl.matrixWorld);
      tempDir.set(0, 0, -1).applyMatrix4(tempMat).normalize();
      tempPos.setFromMatrixPosition(ctrl.matrixWorld);

      raycaster.set(tempPos, tempDir);
      const hits = raycaster.intersectObjects(interactables, true);
      return hits?.[0] || null;
    };

    const castFromGaze = () => {
      if (!camera) return null;
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      const hits = raycaster.intersectObjects(interactables, true);
      return hits?.[0] || null;
    };

    const tick = (dt) => {
      // animate machine
      ring.rotation.z += dt * 0.8;
      core.position.y = 2.3 + Math.sin((performance.now() / 1000) * 2.5) * 0.08;
      light.intensity = 1.5 + Math.sin((performance.now() / 1000) * 1.7) * 0.25;

      // determine best ray source: right controller, left controller, gaze
      const right = controllers?.right;
      const left = controllers?.left;

      let hit = castFromController(right) || castFromController(left) || castFromGaze();

      if (hit?.object) {
        setHovered(hit.object);
      } else {
        setHovered(null);
      }

      // hover FX
      if (hovered) {
        hoverT = Math.min(hoverT + dt, 1);
        const id = hovered.userData.tpId;

        for (const p of padObjs) {
          const on = (p.group.userData.tpId === id);
          const mat = p.ring.material;
          if (mat) mat.opacity = on ? 0.95 : 0.55;
          p.group.scale.setScalar(on ? (1.0 + 0.06 * Math.sin((performance.now()/1000)*10)) : 1.0);
        }
      } else {
        for (const p of padObjs) {
          const mat = p.ring.material;
          if (mat) mat.opacity = 0.65;
          p.group.scale.setScalar(1.0);
        }
      }
    };

    // use engine ticker if available, else fallback to internal RAF
    if (typeof ctx.addTicker === "function") {
      ctx.addTicker(tick);
    } else {
      let last = performance.now();
      const raf = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        tick(dt);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }

    // Activation via:
    // - XR select events (if controllers exist)
    // - Mouse click/tap anywhere (fallback)
    const bindSelect = (ctrl) => {
      if (!ctrl?.addEventListener) return;
      ctrl.addEventListener("select", () => {
        const h = castFromController(ctrl) || (hovered ? { object: hovered } : null);
        const id = h?.object?.userData?.tpId;
        if (id) activate(id);
      });
    };

    bindSelect(controllers?.right);
    bindSelect(controllers?.left);

    window.addEventListener("pointerdown", () => {
      const id = hovered?.userData?.tpId;
      if (id) activate(id);
    });

    log("[teleport_machine] init ✅ machine + pads + raycast");
  }
};
