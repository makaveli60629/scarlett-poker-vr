// /js/teleport_machine.js — Portal Teleporter (IMAGE-STYLE, CDN THREE, GitHub Pages safe)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const TeleportMachine = {
  group: null,
  padCenter: new THREE.Vector3(0, 0, 3.6),

  build(scene, texLoader = null) {
    const g = new THREE.Group();
    g.name = "TeleportPortal";
    g.position.copy(this.padCenter);

    // ---------- base disk ----------
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.95, 0.12, 40),
      new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.35, metalness: 0.75 })
    );
    base.position.y = 0.06;
    g.add(base);

    // ---------- floor glyph ring ----------
    const glyph = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.82, 72),
      new THREE.MeshStandardMaterial({
        color: 0x79b6ff,
        emissive: 0x79b6ff,
        emissiveIntensity: 1.35,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        roughness: 0.35,
        metalness: 0.1
      })
    );
    glyph.rotation.x = -Math.PI / 2;
    glyph.position.y = 0.125;
    glyph.name = "glyph";
    g.add(glyph);

    // ---------- portal frame ----------
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0a1222,
      roughness: 0.4,
      metalness: 0.85,
      emissive: 0x0b1b30,
      emissiveIntensity: 0.25
    });

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 0.28), frameMat);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 0.28), frameMat);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 0.28), frameMat);

    left.position.set(-0.95, 1.35, 0);
    right.position.set(0.95, 1.35, 0);
    top.position.set(0, 2.78, 0);

    g.add(left, right, top);

    // ---------- inner energy plane ----------
    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 2.35),
      new THREE.MeshStandardMaterial({
        color: 0xd8f0ff,
        emissive: 0xd8f0ff,
        emissiveIntensity: 1.1,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15,
        metalness: 0.0
      })
    );
    portal.position.set(0, 1.33, 0);
    portal.name = "portal";
    g.add(portal);

    // ---------- purple electricity arc line (top) ----------
    const arcGeo = new THREE.BufferGeometry();
    const arcPts = new Float32Array(64 * 3);
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPts, 3));
    const arc = new THREE.Line(
      arcGeo,
      new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.95 })
    );
    arc.position.set(0, 2.78, 0);
    arc.name = "arc";
    g.add(arc);

    // ---------- floating debris ----------
    const pCount = 90;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3 + 0] = (Math.random() - 0.5) * 1.7;
      pPos[i * 3 + 1] = Math.random() * 2.2;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 0.45;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const debris = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0xcaa2ff, size: 0.045, transparent: true, opacity: 0.85 })
    );
    debris.name = "debris";
    g.add(debris);

    // ---------- glow light ----------
    const glow = new THREE.PointLight(0x8f6bff, 1.2, 7);
    glow.position.set(0, 1.7, 0.25);
    glow.name = "glow";
    g.add(glow);

    // fx state
    g.userData._t = 0;

    scene.add(g);
    this.group = g;
    return g;
  },

  tick(dt) {
    if (!this.group) return;
    const g = this.group;
    g.userData._t += dt;
    const t = g.userData._t;

    const glyph = g.getObjectByName("glyph");
    const portal = g.getObjectByName("portal");
    const arc = g.getObjectByName("arc");
    const debris = g.getObjectByName("debris");
    const glow = g.getObjectByName("glow");

    if (glyph) glyph.rotation.z += dt * 0.55;

    if (portal) {
      portal.material.emissiveIntensity = 1.0 + Math.sin(t * 4.5) * 0.25;
      portal.material.opacity = 0.82 + Math.sin(t * 3.2) * 0.05;
    }

    if (glow) glow.intensity = 1.0 + Math.sin(t * 5.0) * 0.35;

    if (arc) {
      const arr = arc.geometry.attributes.position.array;
      let idx = 0;
      for (let i = 0; i < 64; i++) {
        const a = (i / 63) * Math.PI * 2;
        const r = 0.92 + Math.sin(t * 10 + i * 0.8) * 0.06;
        const y = Math.sin(t * 12 + i * 1.1) * 0.08;
        arr[idx++] = Math.cos(a) * r;
        arr[idx++] = y;
        arr[idx++] = Math.sin(a) * 0.04;
      }
      arc.geometry.attributes.position.needsUpdate = true;
    }

    if (debris) {
      const p = debris.geometry.attributes.position.array;
      for (let j = 0; j < p.length; j += 3) {
        p[j + 1] += dt * 0.28;
        if (p[j + 1] > 2.4) p[j + 1] = 0;
      }
      debris.geometry.attributes.position.needsUpdate = true;
    }
  },

  getSafeSpawn() {
    return {
      position: new THREE.Vector3(this.padCenter.x, 0, this.padCenter.z + 1.6),
      yaw: 0
    };
  }
};
