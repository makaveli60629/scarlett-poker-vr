import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

export const Controls = {
  create({ renderer, scene, camera, rig, viewer, floors, colliders, noTeleportZone, ui }) {
    const modelFactory = new XRControllerModelFactory();

    // Controllers attached to RIG (so they follow you)
    const c1 = renderer.xr.getController(0);
    const c2 = renderer.xr.getController(1);
    rig.add(c1);
    rig.add(c2);

    const g1 = renderer.xr.getControllerGrip(0);
    g1.add(modelFactory.createControllerModel(g1));
    rig.add(g1);

    const g2 = renderer.xr.getControllerGrip(1);
    g2.add(modelFactory.createControllerModel(g2));
    rig.add(g2);

    // Lasers
    const mkLaser = () => {
      const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
      const mat = new THREE.LineBasicMaterial({ color: 0x66ccff });
      const line = new THREE.Line(geom, mat);
      line.scale.z = 12;
      return line;
    };
    c1.add(mkLaser());
    c2.add(mkLaser());

    // Teleport halo
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.30, 32),
      new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.visible = false;
    scene.add(halo);

    const raycaster = new THREE.Raycaster();
    const tmpRot = new THREE.Matrix4();
    const tmpPos = new THREE.Vector3();
    const tmpDir = new THREE.Vector3();

    let spawn = new THREE.Vector3(0, 0, 7.5);

    function collidesAt(pos) {
      const feet = new THREE.Vector3(pos.x, 0.25, pos.z);
      const chest = new THREE.Vector3(pos.x, 1.1, pos.z);
      for (const b of colliders) {
        if (b.distanceToPoint(feet) < 0.25) return true;
        if (b.distanceToPoint(chest) < 0.25) return true;
      }
      return false;
    }

    function findSafe(p) {
      const base = new THREE.Vector3(p.x, 0, p.z);
      if (!collidesAt(base) && !noTeleportZone(base)) return base;

      const step = 0.35;
      for (let r = 1; r <= 26; r++) {
        const R = r * step;
        for (let i = 0; i < 30; i++) {
          const a = (i / 30) * Math.PI * 2;
          const q = new THREE.Vector3(base.x + Math.cos(a) * R, 0, base.z + Math.sin(a) * R);
          if (!collidesAt(q) && !noTeleportZone(q)) return q;
        }
      }
      return new THREE.Vector3(0, 0, 10);
    }

    function setRoomSpawn(p) {
      spawn.copy(findSafe(p));
      rig.position.copy(spawn);
      rig.position.y = 0;
    }

    function reapplySpawn() {
      rig.position.copy(spawn);
      rig.position.y = 0;
    }

    // XR gamepad states
    const st = {
      left: { axes: [], buttons: [] },
      right: { axes: [], buttons: [] },
      snapCooldown: 0,
      teleHeld: false,
      telePoint: null
    };

    function readGamepad(src, out) {
      const gp = src?.gamepad;
      if (!gp) return;
      out.axes = gp.axes.slice(0);
      out.buttons = gp.buttons.map(b => ({ pressed: b.pressed, value: b.value }));
    }

    function yaw() {
      const e = new THREE.Euler(0, 0, 0, "YXZ");
      e.setFromQuaternion(camera.quaternion);
      return e.y;
    }

    function safeMove(v) {
      const next = rig.position.clone().add(v);
      next.y = 0;
      if (!collidesAt(next)) rig.position.copy(next);
    }

    function snapTurn(rad) {
      // rotate around camera world position so you don't "orbit"
      const camWorld = new THREE.Vector3();
      camera.getWorldPosition(camWorld);
      const pivot = new THREE.Vector3(camWorld.x, rig.position.y, camWorld.z);

      rig.position.sub(pivot);
      rig.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rad);
      rig.position.add(pivot);

      rig.rotation.y += rad;
    }

    function updateTeleportAim() {
      halo.visible = false;
      st.telePoint = null;

      tmpRot.identity().extractRotation(c1.matrixWorld);
      tmpPos.setFromMatrixPosition(c1.matrixWorld);
      tmpDir.set(0, 0, -1).applyMatrix4(tmpRot).normalize();

      raycaster.set(tmpPos, tmpDir);
      raycaster.far = 30;

      const hits = raycaster.intersectObjects(floors, true);
      if (!hits.length) return;

      const p = hits[0].point.clone();
      p.y = 0;

      if (noTeleportZone(p)) return;
      if (collidesAt(p)) return;

      halo.position.set(p.x, 0.01, p.z);
      halo.visible = true;
      st.telePoint = p;
    }

    function doTeleport() {
      if (!st.telePoint) return;
      rig.position.set(st.telePoint.x, 0, st.telePoint.z);
    }

    // Mobile thumbstick (Android)
    const mobile = { x: 0, y: 0 };
    // If your index.html has the stick, it will move this via window events later.
    window.addEventListener("mobile-move", (e) => {
      mobile.x = e?.detail?.x || 0;
      mobile.y = e?.detail?.y || 0;
    });

    function update(dt) {
      const session = renderer.xr.getSession();

      // Non-XR: allow simple drift if mobile sends values
      if (!session) {
        const dead = 0.08;
        if (Math.abs(mobile.x) > dead || Math.abs(mobile.y) > dead) {
          const y = yaw();
          const f = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), y);
          const r = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), y);
          const v = new THREE.Vector3()
            .addScaledVector(f, (-mobile.y) * 2.2 * dt)
            .addScaledVector(r, (mobile.x) * 2.2 * dt);
          safeMove(v);
        }
        return;
      }

      const sources = session.inputSources || [];
      const leftSrc = sources.find(s => s.handedness === "left") || sources[0];
      const rightSrc = sources.find(s => s.handedness === "right") || sources[1] || sources[0];

      readGamepad(leftSrc, st.left);
      readGamepad(rightSrc, st.right);

      const lx = st.left.axes[2] ?? st.left.axes[0] ?? 0;
      const ly = st.left.axes[3] ?? st.left.axes[1] ?? 0;
      const rx = st.right.axes[2] ?? st.right.axes[0] ?? 0;

      // Locomotion (left stick)
      const dead = 0.16;
      if (Math.abs(lx) > dead || Math.abs(ly) > dead) {
        const y = yaw();
        const f = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), y);
        const r = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), y);
        const v = new THREE.Vector3()
          .addScaledVector(f, (-ly) * 2.0 * dt)
          .addScaledVector(r, (lx) * 2.0 * dt);
        safeMove(v);
      }

      // Snap turn 45° (right stick) — NOT inverted
      st.snapCooldown = Math.max(0, st.snapCooldown - dt);
      if (st.snapCooldown <= 0) {
        if (rx > 0.75) { snapTurn(-Math.PI / 4); st.snapCooldown = 0.22; }
        if (rx < -0.75) { snapTurn( Math.PI / 4); st.snapCooldown = 0.22; }
      }

      // Teleport aim (left trigger hold)
      const leftTriggerPressed = st.left.buttons?.[0]?.pressed || (st.left.buttons?.[1]?.value ?? 0) > 0.65;

      if (leftTriggerPressed) {
        st.teleHeld = true;
        updateTeleportAim();
      } else {
        if (st.teleHeld) doTeleport();
        st.teleHeld = false;
        halo.visible = false;
      }
    }

    return { update, setRoomSpawn, reapplySpawn };
  }
};
