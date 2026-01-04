import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Interactions {
  constructor(camera, scene, domElement){
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.tmpDir = new THREE.Vector3();
  }

  // Raycast straight from camera center to players
  raycastPlayers(players){
    this.camera.getWorldDirection(this.tmpDir);
    this.raycaster.set(this.camera.getWorldPosition(new THREE.Vector3()), this.tmpDir);
    this.raycaster.far = 25;

    // We want to hit nested meshes, so expand objects
    const targets = [];
    for (const p of players){
      p.traverse((o) => { if (o.isMesh) targets.push(o); });
    }

    const hits = this.raycaster.intersectObjects(targets, false);
    if (!hits.length) return null;

    // Return top hit + root player object
    const mesh = hits[0].object;
    let root = mesh;
    while (root && !root.userData?.isPlayer && root.parent) root = root.parent;
    return { object: root, hit: hits[0] };
  }
}
