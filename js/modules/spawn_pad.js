export const module_spawn_pad = {
  id: 'spawn_pad',
  async init(env) {
    const { THREE, scene } = env;

    // Spawn pad at origin (slightly forward from center of lobby)
    const spawnPoint = new THREE.Vector3(0, 0, 6);
    env.state.spawnPoint.copy(spawnPoint);
    env.state.spawnYaw = Math.PI; // face toward table

    const padGeo = new THREE.RingGeometry(0.35, 0.55, 48);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x7c4dff, roughness: 0.2, metalness: 0.5, emissive: 0x2b1a66, emissiveIntensity: 0.8 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(spawnPoint);
    pad.position.y = 0.01;
    pad.receiveShadow = true;
    scene.add(pad);

    // Spawn "marker" pillar for quick visual confirmation
    const pillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xff3b3b, roughness: 0.8 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.copy(spawnPoint);
    pillar.position.y = 0.6;
    pillar.castShadow = true;
    scene.add(pillar);

    env.log?.('spawn pad ready ✅');

    return {
      handles: { spawnPad: pad },
      update(dt) {
        // subtle pulse
        const t = performance.now() * 0.002;
        pad.material.emissiveIntensity = 0.55 + 0.25 * Math.sin(t);
      }
    };
  }
};
