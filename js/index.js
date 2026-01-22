// js/index.js
import * as THREE from "three";
import { createSunkenPokerSystem } from "./world.js";

let pokerSystem = null;

function boot({ scene, camera, renderer }) {
  // Optional loader (recommended)
  const loadingManager = new THREE.LoadingManager();
  const textureLoader = new THREE.TextureLoader(loadingManager);

  // You can preload felt + 52 cards here if you want a clean “no pop-in” boot.
  // If you don’t preload, world.js will load lazily via textureLoader anyway.
  const assets = { feltTex: null, cardTex: [] };

  assets.feltTex = textureLoader.load("assets/textures/poker_felt_passline.jpg");
  for (let i = 0; i < 52; i++) {
    assets.cardTex[i] = textureLoader.load(`assets/textures/cards/card_${i}.jpg`);
  }

  loadingManager.onLoad = () => {
    // Build ONE unified object
    pokerSystem = createSunkenPokerSystem({
      scene,
      renderer,
      textureLoader,
      assets,
    });

    // If you want to move the whole pit later:
    // pokerSystem.group.position.set(0, 0, 0);

    // Example: shoe touch deals 2 cards to seat 0 (wire to real state machine later)
    window.addEventListener("scarlett:shoe_touch", () => {
      pokerSystem.debug.dealTwoToSeat(0);
      console.log("[poker] shoe touched -> test deal");
    });
  };

  // Animation loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    if (pokerSystem) pokerSystem.update(dt);

    renderer.render(scene, camera);
  });
}

export { boot };
