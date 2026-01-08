// /js/teleport_machine.js — Scarlett Teleport Machine (9.0)
// ✅ NO imports here. THREE is injected from world.js.
// ✅ Does NOT add itself to scene/group — world.js will parent it (prevents rig bugs).

export const TeleportMachine = {
  group: null,
  _THREE: null,
  padCenter: { x: 0, y: 0, z: 3.6 },

  build({ THREE, texLoader = null } = {}) {
    this._THREE = THREE;

    const g = new THREE.Group();
    g.name = "TeleportMachine";
    g.position.set(this.padCenter.x, this.padCenter.y, this.padCenter.z);

    // ---- Base ----
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.92, 0.20, 34),
      new THREE.MeshStandardMaterial({
        color: 0x0d0f18,
        roughness: 0.92,
        metalness: 0.18,
      })
    );
    base.position.y = 0.10;
    g.add(base);

    // ---- Purple main ring (big + bright) ----
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x7a34ff,
      emissive: 0x7a34ff,
      emissiveIntensity: 1.6,
      roughness: 0.35,
      metalness: 0.15,
      transparent: true,
      opacity: 0.96,
    });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.07, 18, 84),
      ringMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.52;
    ring.name = "ring";
    g.add(ring);

    // ---- Inner glow ring (optional texture, still purple) ----
    let innerGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x7a34ff,
      emissiveIntensity: 1.35,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95,
    });

    if (texLoader) {
      try {
        const t = texLoader.load(
          "assets/textures/Teleport glow.jpg",
          (tt) => {
            tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
            tt.repeat.set(1, 1);
            tt.colorSpace = THREE.SRGBColorSpace;
          },
          undefined,
          () => {}
        );

        innerGlowMat = new THREE.MeshStandardMaterial({
          map: t,
          color: 0xffffff,
          emissive: 0x7a34ff,
          emissiveIntensity: 1.05,
          roughness: 0.35,
          metalness: 0.05,
          transparent: true,
          opacity: 0.92,
        });
      } catch {}
    }

    const innerGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.045, 14, 72),
      innerGlowMat
    );
    innerGlow.rotation.x = Math.PI / 2;
    innerGlow.position.y = 0.15;
    innerGlow.name = "innerGlow";
    g.add(innerGlow);

    // ---- Core column ----
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.78, 18),
      new THREE.MeshStandardMaterial({
        color: 0x0b0c12,
        emissive: 0x7a34ff,
        emissiveIntensity: 0.25,
        roughness: 0.7,
        metalness: 0.15,
      })
    );
    core.position.y = 0.62;
    core.name = "core";
    g.add(core);

    // ---- Top cap ----
    const topCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.30, 0.07, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.95,
        roughness: 0.4,
        metalness: 0.35,
      })
    );
    topCap.position.y = 0.24;
    topCap.name = "topCap";
    g.add(topCap);

    // ---- Purple electricity loop (Line) ----
    const zapGeo = new THREE.BufferGeometry();
    const zapCount = 80;
    const zapPts = new Float32Array(zapCount * 3);
    zapGeo.setAttribute("position", new THREE.BufferAttribute(zapPts, 3));

    const zap = new THREE.Line(
      zapGeo,
      new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.90 })
    );
    zap.position.y = 0.56;
    zap.name = "zap";
    g.add(zap);

    // ---- Sparks (Points) ----
    const sparkCount = 26;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));

    const sparks = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({ color: 0xd7b7ff, size: 0.035, transparent: true, opacity: 0.95 })
    );
    sparks.position.y = 0.36;
    sparks.name = "sparks";
    g.add(sparks);

    // ---- Light glow ----
    const glow = new THREE.PointLight(0x8f3dff, 1.05, 8);
    glow.position.set(0, 0.95, 0);
    glow.name = "glowLight";
    g.add(glow);

    // ---- FX state ----
    g.userData._t = 0;
    g.userData._sparkCount = sparkCount;
    g.userData._sparkPos = sparkPos;
    g.userData._sparkVel = Array.from({ length: sparkCount }, () => new THREE.Vector3());

    // init sparks
    for (let i = 0; i < sparkCount; i++) {
      this._respawnSpark(g, i);
    }

    this.group = g;
    return g;
  },

  _respawnSpark(g, i) {
    const THREE = this._THREE;
    if (!THREE) return;

    const pos = g.userData._sparkPos;
    const vel = g.userData._sparkVel;

    const a = Math.random() * Math.PI * 2;
    const rr = 0.22 + Math.random() * 0.45;

    pos[i * 3 + 0] = Math.cos(a) * rr;
    pos[i * 3 + 1] = (Math.random() * 0.18) - 0.08;
    pos[i * 3 + 2] = Math.sin(a) * rr;

    vel[i].set(
      (Math.random() - 0.5) * 0.22,
      0.32 + Math.random() * 0.30,
      (Math.random() - 0.5) * 0.22
    );
  },

  tick(dt) {
    const g = this.group;
    if (!g) return;

    g.userData._t += dt;
    const t = g.userData._t;

    const ring = g.getObjectByName("ring");
    const innerGlow = g.getObjectByName("innerGlow");
    const zap = g.getObjectByName("zap");
    const sparks = g.getObjectByName("sparks");
    const glowLight = g.getObjectByName("glowLight");

    // ring spin + pulse
    if (ring) {
      ring.rotation.z += dt * 0.95;
      ring.material.emissiveIntensity = 1.35 + Math.sin(t * 6.0) * 0.45;
    }

    if (innerGlow) {
      innerGlow.rotation.z -= dt * 0.55;
      innerGlow.material.emissiveIntensity = 0.95 + Math.sin(t * 5.0) * 0.25;
    }

    if (glowLight) {
      glowLight.intensity = 0.85 + Math.sin(t * 6.5) * 0.30;
    }

    // electricity loop (visible + “alive”)
    if (zap) {
      const arr = zap.geometry.attributes.position.array;
      let idx = 0;
      const count = arr.length / 3;

      for (let i = 0; i < count; i++) {
        const a = (i / (count - 1)) * Math.PI * 2;
        const rr = 0.60 + Math.sin(t * 10.0 + i * 0.55) * 0.055; // stronger wobble
        const y = Math.sin(t * 13.0 + i * 0.9) * 0.06;          // more visible zaps

        arr[idx++] = Math.cos(a) * rr;
        arr[idx++] = y;
        arr[idx++] = Math.sin(a) * rr;
      }
      zap.geometry.attributes.position.needsUpdate = true;
    }

    // sparks drift + respawn
    if (sparks) {
      const pos = g.userData._sparkPos;
      const vel = g.userData._sparkVel;
      const n = g.userData._sparkCount;

      for (let i = 0; i < n; i++) {
        pos[i * 3 + 0] += vel[i].x * dt;
        pos[i * 3 + 1] += vel[i].y * dt;
        pos[i * 3 + 2] += vel[i].z * dt;

        if (pos[i * 3 + 1] > 0.55 || Math.random() < 0.006) {
          this._respawnSpark(g, i);
        }
      }
      sparks.geometry.attributes.position.needsUpdate = true;
    }
  },

  getSafeSpawn() {
    const THREE = this._THREE;
    // if tick/build hasn’t run yet, still return a plain object
    if (!THREE) {
      return { position: { x: this.padCenter.x, y: 0, z: this.padCenter.z + 1.2 }, yaw: 0 };
    }

    return {
      position: new THREE.Vector3(this.padCenter.x, 0, this.padCenter.z + 1.2),
      yaw: 0,
    };
  }
};
