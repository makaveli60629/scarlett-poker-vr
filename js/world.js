import * as THREE from 'three';

export const World = {
  build(ctx){
    const { scene } = ctx;

    const root = new THREE.Group();
    root.name = 'WORLD_ROOT';
    scene.add(root);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.85);
    root.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(4, 8, 2);
    root.add(dir);

    // Lobby floor (teleport target)
    const lobby = new THREE.Group();
    lobby.name = 'LOBBY';
    root.add(lobby);

    const floorGeo = new THREE.CircleGeometry(10, 64);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.95, metalness: 0.0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.name = 'FLOOR_MAIN';
    lobby.add(floor);

    // Wall + ceiling
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 10, 2.8, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1a1e27, roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide })
    );
    wall.position.y = 1.4;
    lobby.add(wall);

    const ceiling = new THREE.Mesh(
      new THREE.CircleGeometry(10, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b0e14, emissive: 0x111a33, emissiveIntensity: 0.35, roughness: 1 })
    );
    ceiling.rotation.x = Math.PI/2;
    ceiling.position.y = 3.2;
    lobby.add(ceiling);

    // Poker pit floor (teleport target)
    const pit = new THREE.Group();
    pit.name = 'POKER_PIT';
    root.add(pit);

    const pitRing = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.8, 0.6, 64, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x141821, roughness: 0.85, metalness: 0.1, side: THREE.DoubleSide })
    );
    pitRing.position.y = 0.3;
    pit.add(pitRing);

    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(4.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x3a3f4c, roughness: 0.95 })
    );
    pitFloor.rotation.x = -Math.PI/2;
    pitFloor.position.y = 0.01;
    pitFloor.name = 'FLOOR_PIT';
    pit.add(pitFloor);

    // Table at origin (spawn offset keeps you off-table)
    const table = new THREE.Group();
    table.name = 'TABLE';
    root.add(table);

    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 0.18, 48),
      new THREE.MeshStandardMaterial({ color: 0x1d6b4b, roughness: 0.85 })
    );
    tableTop.position.set(0, 0.95, 0);
    table.add(tableTop);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 0.9, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 })
    );
    tableBase.position.set(0, 0.45, 0);
    table.add(tableBase);

    // Chairs
    const chairs = new THREE.Group();
    chairs.name = 'CHAIRS';
    root.add(chairs);

    const chairGeo = new THREE.BoxGeometry(0.35, 0.45, 0.35);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x5b5f68, roughness: 0.9 });

    for(let i=0;i<6;i++){
      const a = (i/6)*Math.PI*2;
      const c = new THREE.Mesh(chairGeo, chairMat);
      c.position.set(Math.cos(a)*2.6, 0.42, Math.sin(a)*2.6);
      c.rotation.y = -a;
      chairs.add(c);
    }

    // Test ball at table center
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.35 })
    );
    ball.position.set(0, 1.2, 0);
    root.add(ball);

    const floors = [floor, pitFloor];

    function reset(){ /* spawn handled in main */ }
    function update(dt){
      const t = performance.now()*0.001;
      hemi.intensity = 0.8 + Math.sin(t)*0.05;
      void dt;
    }

    return { root, floors, update, reset };
  }
};
