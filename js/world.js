import * as THREE from 'three';

export const World = (() => {
  let floors = [];
  const spawns = new Map();
  let matNeonA, matNeonP, matGold;

  function build({ THREE, scene, renderer }) {
    const root = new THREE.Group();
    scene.add(root);

    // --- ATMOSPHERE ---
    scene.fog = new THREE.FogExp2(0x0b0d14, 0.02);
    const colAqua = 0x7fe7ff, colPink = 0xff2d7a, colGold = 0xd2b46a;

    // --- MATERIALS ---
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.2, metalness: 0.5, side: THREE.DoubleSide });
    const matWall = new THREE.MeshStandardMaterial({ color: 0x14182a, roughness: 0.9 });
    matGold = new THREE.MeshStandardMaterial({ color: colGold, metalness: 0.9, roughness: 0.1 });
    matNeonA = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: colAqua, emissiveIntensity: 2 });
    matNeonP = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: colPink, emissiveIntensity: 2 });

    // --- LIGHTS ---
    root.add(new THREE.AmbientLight(0xffffff, 0.5));
    const p1 = new THREE.PointLight(0xffffff, 1.5, 20); p1.position.set(0, 8, 0); root.add(p1);

    // --- TERRAIN: THE PIT & RAMP ---
    const pitR = 6.4, pitDepth = 1.6, rampR = 9;
    
    // Top Floor
    const topFloor = new THREE.Mesh(new THREE.RingGeometry(rampR, 25, 64), matFloor);
    topFloor.rotation.x = -Math.PI / 2;
    root.add(topFloor); floors.push(topFloor);

    // Pit Floor
    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitR, 64), matFloor);
    pitFloor.position.y = -pitDepth; pitFloor.rotation.x = -Math.PI / 2;
    root.add(pitFloor); floors.push(pitFloor);

    // The Ramp
    const rampGeo = new THREE.CylinderGeometry(pitR, rampR, pitDepth, 64, 1, true);
    const ramp = new THREE.Mesh(rampGeo, matFloor);
    ramp.position.y = -pitDepth / 2;
    root.add(ramp); floors.push(ramp);

    // --- GUARDRAIL ---
    const guard = new THREE.Mesh(new THREE.TorusGeometry(rampR, 0.1, 16, 100), matGold);
    guard.position.y = 1.1; guard.rotation.x = Math.PI / 2;
    root.add(guard);

    // --- VIP SPAWN ROOM ---
    const vipPos = new THREE.Vector3(14, 0, 6);
    const vipFloor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 6), matFloor);
    vipFloor.position.copy(vipPos); root.add(vipFloor); floors.push(vipFloor);
    spawns.set("vip", { x: 14, y: 0.1, z: 6, yaw: -Math.PI / 1.5 });

    // --- BEAUTIFICATION: GODRAY ---
    const godRay = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 12, 32, 1, true), 
        new THREE.MeshBasicMaterial({ color: colAqua, transparent: true, opacity: 0.05, side: THREE.DoubleSide }));
    godRay.position.y = 4; root.add(godRay);
  }

  return {
    build,
    getSpawn: () => spawns.get("vip"),
    getFloors: () => floors,
    update: (t) => {
        matNeonA.emissiveIntensity = 2 + Math.sin(t * 2);
        matNeonP.emissiveIntensity = 2 + Math.cos(t * 2);
    }
  };
})();
