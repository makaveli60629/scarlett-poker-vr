export const module_casino_shell = {
  id: 'casino_shell',
  async init(env) {
    const { THREE, scene } = env;

    // Big room walls (simple)
    const room = new THREE.Group();

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.95 });
    const wallGeo = new THREE.BoxGeometry(30, 8, 0.4);

    const back = new THREE.Mesh(wallGeo, wallMat);
    back.position.set(0, 4, -10);
    back.receiveShadow = true;
    room.add(back);

    const front = new THREE.Mesh(wallGeo, wallMat);
    front.position.set(0, 4, 14);
    room.add(front);

    const sideGeo = new THREE.BoxGeometry(0.4, 8, 24);
    const left = new THREE.Mesh(sideGeo, wallMat);
    left.position.set(-15, 4, 2);
    room.add(left);
    const right = new THREE.Mesh(sideGeo, wallMat);
    right.position.set(15, 4, 2);
    room.add(right);

    // ceiling
    const ceilGeo = new THREE.BoxGeometry(30, 0.4, 24);
    const ceiling = new THREE.Mesh(ceilGeo, wallMat);
    ceiling.position.set(0, 8.2, 2);
    room.add(ceiling);

    // glowing sign
    const signGeo = new THREE.PlaneGeometry(6, 1.2);
    const signMat = new THREE.MeshStandardMaterial({ color: 0x0b0f14, emissive: 0x7c4dff, emissiveIntensity: 1.2 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 5.6, -9.79);
    room.add(sign);

    // simple neon pillars
    for (const x of [-12, 12]) {
      const pGeo = new THREE.CylinderGeometry(0.18, 0.18, 6.5, 18);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x182433, emissive: 0x103a55, emissiveIntensity: 0.8, roughness: 0.35, metalness: 0.25 });
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(x, 3.25, -7);
      p.castShadow = true;
      room.add(p);
    }

    scene.add(room);
    env.log?.('casino shell ready ✅');

    return {
      handles: { room },
      update() {
        const t = performance.now() * 0.0015;
        sign.material.emissiveIntensity = 1.0 + 0.25 * Math.sin(t);
      }
    };
  }
};
