// mechanics.js - The Permanent Engine
// Handles: Oculus Locomotion, Hand Structure, and Global Logics

document.write('<script src="https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v6.1.1/dist/aframe-extras.min.js"></script>');

// 1. Permanent Sit Logic
AFRAME.registerComponent('auto-sit', {
  init: function () {
    this.el.addEventListener('click', () => {
      const rig = document.querySelector('#rig');
      rig.setAttribute('position', this.el.getAttribute('data-sit-pos'));
      rig.setAttribute('movement-controls', 'enabled: false'); // Lock movement while sitting
    });
  }
});

// 2. Global Hand & Control Setup
window.onload = () => {
  const scene = document.querySelector('a-scene');
  const rig = document.createElement('a-entity');
  rig.setAttribute('id', 'rig');
  rig.setAttribute('movement-controls', 'controls: checkpoint, gamepad, keyboard, touch; speed: 0.3');
  
  // Camera / Head
  const camera = document.createElement('a-entity');
  camera.setAttribute('id', 'camera');
  camera.setAttribute('camera', '');
  camera.setAttribute('look-controls', '');
  camera.setAttribute('position', '0 1.6 0');
  
  const cursor = document.createElement('a-cursor');
  cursor.setAttribute('color', '#00fbff');
  camera.appendChild(cursor);
  rig.appendChild(camera);

  // LEFT HAND - Structure for Movement
  const leftHand = document.createElement('a-entity');
  leftHand.setAttribute('oculus-touch-controls', 'hand: left');
  leftHand.setAttribute('smooth-locomotion', '');
  rig.appendChild(leftHand);

  // RIGHT HAND - Structure for Interaction
  const rightHand = document.createElement('a-entity');
  rightHand.setAttribute('oculus-touch-controls', 'hand: right');
  rightHand.setAttribute('laser-controls', 'hand: right');
  rig.appendChild(rightHand);

  scene.appendChild(rig);
};
