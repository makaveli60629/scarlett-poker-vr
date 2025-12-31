// mechanics.js - The Logic Engine

// 1. AUTO-SIT LOGIC
AFRAME.registerComponent('auto-sit', {
  init: function () {
    this.el.addEventListener('click', () => {
      const rig = document.querySelector('#rig');
      const sitPos = this.el.getAttribute('data-sit-pos');
      rig.setAttribute('position', sitPos);
      rig.setAttribute('movement-controls', 'enabled: false');
    });
  }
});

// 2. DOOR LOGIC (Lobby to Store)
AFRAME.registerComponent('door-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      // Open animation
      this.el.setAttribute('animation', 'property: rotation; to: 0 90 0; dur: 1000');
      // Teleport to store after 1 second
      setTimeout(() => {
        window.location.href = 'store.html';
      }, 1000);
    });
  }
});

// 3. GIVEAWAY LOGIC
AFRAME.registerComponent('giveaway-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      this.el.setAttribute('visible', 'false');
      console.log("Chips Claimed");
    });
  }
});
