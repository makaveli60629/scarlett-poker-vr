import { applyLighting } from "./lighting.js";
import { Humanoids } from "./humanoids.js";
import { PokerJS } from "./poker.js";

export const World = {
  async init(ctx) {
    const { THREE, scene, log } = ctx;

    const root = new THREE.Group();
    scene.add(root);

    // Floor (guaranteed visual)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60,60),
      new THREE.MeshStandardMaterial({ color:0x0a0f1f })
    );
    floor.rotation.x = -Math.PI/2;
    root.add(floor);
    log("Floor OK");

    // Lighting
    applyLighting({ THREE, scene, root });
    log("Lighting OK");

    // Table
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6,1.6,0.22,36),
      new THREE.MeshStandardMaterial({ color:0x0b6b3a })
    );
    table.position.y = 0.75;
    root.add(table);
    log("Table OK");

    // Humanoids
    const humanoids = Humanoids.init({ THREE, root });
    humanoids.spawnBots({
      count:6,
      center:new THREE.Vector3(0,0,0),
      radius:2.3,
      y:0,
      lookAt:new THREE.Vector3(0,1.2,0)
    });
    log("Humanoids OK");

    // Poker
    const poker = PokerJS.init({
      THREE, scene, root, log,
      deckPos:new THREE.Vector3(0,1.05,0),
      potPos:new THREE.Vector3(0,1.02,0)
    });
    log("Poker OK");

    return {
      update(dt) {
        humanoids.update(dt, performance.now()/1000);
        poker.update(dt);
      }
    };
  }
};
