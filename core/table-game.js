import * as THREE from './three.min.js';
import { GLTFLoader } from './GLTFLoader.js';

const scene = document.querySelector('a-scene');

let deck, players = [], communityCards = [], pot = 0;
const loader = new GLTFLoader();

// Load deck model
loader.load('assets/cards.glb', (gltf) => {
  deck = gltf.scene;
  scene.appendChild(deck);
});

// Load player avatars
for (let i = 1; i <= 6; i++) {
  loader.load('assets/humanoid.glb', (gltf) => {
    const player = gltf.scene;
    // Set positions automatically
    const positions = [
      [-1, 0, 1], [1, 0, 1],
      [-1, 0, -1], [1, 0, -1],
      [0, 0, -1.5], [0, 0, 1.5]
    ];
    player.position.set(...positions[i - 1]);
    player.rotation.y = i % 2 === 0 ? Math.PI : 0;
    scene.appendChild(player);
    players.push(player);
  });
}

// Load chip stack
loader.load('assets/chips.glb', (gltf) => {
  const chips = gltf.scene;
  chips.position.set(0, 0.05, 0);
  scene.appendChild(chips);
});

// Deal cards to players
function dealCards() {
  players.forEach(player => {
    if (!deck) return;
    const cardClone = deck.clone(true);
    cardClone.position.set(player.position.x, 0.1, player.position.z - 0.5);
    scene.appendChild(cardClone);
    // Optional: add card flip animation here
  });
}

// Add chips to pot animation
function addChipsToPot(amount) {
  const chipClone = scene.getElementById('chipStack').cloneNode(true);
  chipClone.position.set(0, 0.05, 0);
  scene.appendChild(chipClone);
  pot += amount;
  // Optional: animate chips moving into center
}

// Start a demo round
setTimeout(() => {
  dealCards();
}, 1000);
