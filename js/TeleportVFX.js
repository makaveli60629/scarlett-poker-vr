// /js/TeleportVFX.js
// Simple CPU VFX: rotating arcs + particles (no shaders required)

export class TeleportVFX {
  constructor({ THREE, parent }) {
    this.THREE = THREE;
    this.parent = parent;
    this.enabled = true;
    this.intensity = 1.0;
    this.t = 0;

    this.group = new THREE.Group();
    this.group.name = "TeleportVFX";
    this.group.position.y = 1.55;
    parent.add(this.group);

    // "electric arcs" made from thin torus segments
    this.arcMats = [];
    this.arcs = [];

    const arcGeo = new THREE.TorusGeometry(0.33, 0.008, 10, 64, Math.PI * 1.15);
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2b0a4d,
        emissive: 0x9b4dff,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const arc = new THREE.Mesh(arcGeo, mat);
      arc.rotation.x = Math.PI / 2;
      arc.rotation.z = (i / 3) * Math.PI * 2;
      arc.rotation.y = (i / 3) * 0.9;
      arc.position.y = 0.0;
      this.group.add(arc);
      this.arcMats.push(mat);
      this.arcs.push(arc);
    }

    // small "spark" spheres
    this.sparks = [];
    this.sparkMats = [];
    const sparkGeo = new THREE.SphereGeometry(0.015, 10, 10);
    for (let i = 0; i < 18; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x14051f,
        emissive: 0xb06cff,
        emissiveIntensity: 2.8,
        roughness: 0.25,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const s = new THREE.Mesh(sparkGeo, mat);
      s.userData.phase = Math.random() * Math.PI * 2;
      s.userData.speed = 1.2 + Math.random() * 1.3;
      s.userData.radius = 0.18 + Math.random() * 0.22;
      s.userData.height = (Math.random() - 0.5) * 0.22;
      this.group.add(s);
      this.sparks.push(s);
      this.sparkMats.push(mat);
    }
  }

  setEnabled(on) {
    this.enabled = !!on;
    this.group.visible = this.enabled;
  }

  setIntensity(v) {
    this.intensity = Math.max(0, v);
  }

  update(dt) {
    if (!this.enabled) return;
    this.t += dt;

    // arcs rotation + flicker
    for (let i = 0; i < this.arcs.length; i++) {
      const a = this.arcs[i];
      a.rotation.z += dt * (0.75 + i * 0.25);
      a.rotation.y += dt * (0.35 + i * 0.18);

      const flick = 1.8 + Math.sin(this.t * 10.0 + i * 1.7) * 0.8;
      this.arcMats[i].emissiveIntensity = flick * (1.0 + this.intensity * 0.8);
      this.arcMats[i].opacity = 0.55 + (Math.sin(this.t * 7.0 + i) * 0.18);
    }

    // sparks orbit
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      const ph = s.userData.phase + this.t * s.userData.speed;
      const r = s.userData.radius;
      s.position.x = Math.cos(ph) * r;
      s.position.z = Math.sin(ph) * r;
      s.position.y = s.userData.height + Math.sin(ph * 2.0) * 0.03;

      const flick = 2.2 + Math.sin(this.t * 14.0 + i) * 1.2;
      this.sparkMats[i].emissiveIntensity = flick * (1.0 + this.intensity * 0.9);
      this.sparkMats[i].opacity = 0.5 + (Math.sin(this.t * 9.0 + i) * 0.25);
    }
  }

  dispose() {
    this.parent.remove(this.group);
  }
}
