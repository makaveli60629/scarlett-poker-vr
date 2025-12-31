AFRAME.registerComponent('poker-logic', {
  init: function () {
    this.el.sceneEl.addEventListener('dealCards', () => {
      this.spawnHighFidelityCards();
    });
  },
  spawnHighFidelityCards: function () {
    // Logic for low-poly cards that look real
    for (let i = 0; i < 2; i++) {
      let card = document.createElement('a-plane');
      card.setAttribute('width', '0.15');
      card.setAttribute('height', '0.22');
      card.setAttribute('position', {x: (i * 0.2) - 0.1, y: 1.1, z: -7.5});
      card.setAttribute('rotation', '-90 0 0');
      card.setAttribute('src', '#card-front');
      card.setAttribute('material', 'roughness: 0.1; metalness: 0');
      this.el.sceneEl.appendChild(card);
    }
  }
});
