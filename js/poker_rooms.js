AFRAME.registerComponent('poker-logic', {
  init: function () {
    this.el.sceneEl.addEventListener('dealCards', () => {
      this.spawnCards();
    });
  },
  spawnCards: function () {
    // Spawn 2 cards directly in front of seated player
    for (let i = 0; i < 2; i++) {
      let card = document.createElement('a-box'); // Using thin boxes for 3D feel
      card.setAttribute('width', '0.15');
      card.setAttribute('height', '0.01');
      card.setAttribute('depth', '0.22');
      card.setAttribute('position', {x: (i * 0.2) - 0.1, y: 0.15, z: -0.5});
      card.setAttribute('material', 'src: #card-front; roughness: 0.2');
      document.querySelector('.play-zone').appendChild(card);
    }
  }
});
