import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Chairs = {
  group: null,
  seats: [],
  colliders: [],
  raycaster: new THREE.Raycaster(),

  build(scene) {
    this.group = new THREE.Group();
    this.group.position.set(0,0,0);

    const chairMat = new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.95 });
    const ringMat  = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x003355, roughness: 0.5 });

    const radiusX = 2.05;
    const radiusZ = 1.35;

    for (let i=0;i<6;i++){
      const a = (i/6) * Math.PI*2;
      const x = Math.cos(a) * radiusX;
      const z = Math.sin(a) * radiusZ;

      const chair = new THREE.Group();
      chair.position.set(x, 0, z);
      chair.lookAt(0, 0.75, 0);

      // seat base collider
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.45,18), chairMat);
      base.position.y = 0.225;
      base.castShadow = true;
      base.userData.collider = true;
      chair.add(base);
      this.colliders.push(base);

      // seat top
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.10,0.45), chairMat);
      seat.position.y = 0.52;
      seat.castShadow = true;
      seat.userData.collider = true;
      chair.add(seat);
      this.colliders.push(seat);

      // Join ring (clickable)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28,0.03,10,32), ringMat);
      ring.rotation.x = Math.PI/2;
      ring.position.y = 0.62;
      ring.userData.seatIndex = i;
      ring.name = "joinRing";
      chair.add(ring);

      this.seats.push({
        index:i,
        chair,
        ring,
        occupied: (i !== 0) // keep seat 0 open by default
      });

      // If occupied, hide ring
      if (i !== 0) ring.visible = false;

      this.group.add(chair);
    }

    scene.add(this.group);
  },

  hitTest(origin, dir) {
    this.raycaster.set(origin, dir);
    const rings = this.seats.map(s=>s.ring).filter(r=>r.visible);
    const hits = this.raycaster.intersectObjects(rings, false);
    return hits.length ? hits[0].object : null;
  },

  getSeatTransform(index) {
    const s = this.seats.find(x=>x.index===index);
    if (!s) return null;

    // Seat position slightly inward towards table
    const p = new THREE.Vector3();
    s.chair.getWorldPosition(p);

    const look = new THREE.Vector3(0, 0.75, 0);
    const dir = look.clone().sub(p).normalize();

    const sitPos = p.clone().add(dir.multiplyScalar(0.25));
    sitPos.y = 0;

    return { position: sitPos, lookAt: look };
  },

  setSeatOpen(index, open) {
    const s = this.seats.find(x=>x.index===index);
    if (!s) return;
    s.occupied = !open;
    s.ring.visible = open;
  }
};
