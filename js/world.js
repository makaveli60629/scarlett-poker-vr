// /js/world.js — Scarlett WORLD (SAFE FULL STUB) v1
// This world stays stable. It will load your extra modules if present (pit_table, bot_rig, billboards, store_vip).
// If a module is missing, it logs and continues. No hard crashes.

async function optImport(path, log) {
  try { return await import(`${path}?v=${Date.now()}`); }
  catch (e) { log?.(`[world] optional import failed: ${path} ❌ ${e?.message || e}`); return null; }
}

export const World = {
  colliders: [],
  group: null,
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    log?.(`[world] init ✅ build=${BUILD}`);

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);
    this.group = root;

    // bright lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x05060a, 1.15);
    root.add(hemi);

    const a1 = new THREE.DirectionalLight(0xffffff, 1.3);
    a1.position.set(12, 18, 6);
    root.add(a1);

    // Lobby shell (tall gray)
    const shell = new THREE.Group();
    root.add(shell);

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.9, metalness: 0.05 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 96), floorMat);
    floor.rotation.x = -Math.PI / 2;
    shell.add(floor);
    this.colliders = [floor];

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3d46, roughness: 0.95, metalness: 0.05 });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 14, 96, 1, true), wallMat);
    wall.position.y = 7;
    shell.add(wall);

    // deeper divot (visual pit ring)
    const pit = new THREE.Mesh(
      new THREE.CylinderGeometry(12.2, 12.2, 2.6, 64, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x151825, roughness: 1, metalness: 0.05 })
    );
    pit.position.y = -1.3; // deeper
    root.add(pit);

    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(12.1, 64), floorMat);
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -2.6; // deeper floor
    root.add(pitFloor);
    this.colliders.push(pitFloor);

    // stairs down
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.9, metalness: 0.08 });
    const stairs = new THREE.Group();
    stairs.position.set(0, 0, 18);
    root.add(stairs);

    for (let i=0;i<10;i++){
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.9), stairMat);
      step.position.set(0, 0.09 + i*0.18, -i*0.9);
      stairs.add(step);
      this.colliders.push(step);
    }

    log?.("[world] lobby shell + pit + stairs ✅");

    // OPTIONAL: pit_table module
    const pitTable = await optImport("./pit_table.js", log);
    if (pitTable?.buildPitTable) {
      const table = pitTable.buildPitTable({ THREE, root, log });
      if (table?.colliders?.length) this.colliders.push(...table.colliders);
      log?.("[world] pit_table ✅");
    }

    // OPTIONAL: billboards module
    const bill = await optImport("./billboards.js", log);
    if (bill?.buildBillboards) {
      bill.buildBillboards({ THREE, root, log });
      log?.("[world] billboards ✅");
    }

    // OPTIONAL: bot_rig module
    const rig = await optImport("./bot_rig.js", log);
    if (rig?.spawnLobbyBots) {
      rig.spawnLobbyBots({ THREE, root, log });
      log?.("[world] bot_rig ✅");
    }

    // OPTIONAL: store_vip module
    const vip = await optImport("./store_vip.js", log);
    if (vip?.buildSpawnArch) vip.buildSpawnArch({ THREE, root, pos: [0,0,10] });
    if (vip?.buildStoreStub) vip.buildStoreStub({ THREE, root, pos: [16,0,2] });
    if (vip?.buildVIPEntrance) vip.buildVIPEntrance({ THREE, root, start: [-16,0,2] });
    if (vip) log?.("[world] store_vip ✅");

    log?.("[world] build complete ✅");
  },

  update(dt){
    // keep empty for now — your optional modules can animate their own stuff
  }
};
