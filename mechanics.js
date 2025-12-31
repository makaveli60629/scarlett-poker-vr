// mechanics.js - Engineering & Logic Only

// 1. SIT LOGIC
AFRAME.registerComponent('auto-sit', {
  init: function () {
    this.el.addEventListener('click', () => {
      const rig = document.querySelector('#rig');
      // Set sitting position
      rig.setAttribute('position', this.el.getAttribute('data-sit-pos'));
      // Stop walking while sitting
      rig.setAttribute('movement-controls', 'enabled: false');
      console.log("VR Sit Active");
    });
  }
});

// 2. BACK DOOR LOGIC (Modular)
AFRAME.registerComponent('door-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      this.el.setAttribute('animation', 'property: rotation; to: 0 90 0; dur: 1000');
    });
  }
});

// 3. DAILY GIVEAWAY LOGIC
AFRAME.registerComponent('giveaway-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      this.el.setAttribute('visible', 'false');
      // We will add the Chip Counter logic here next!
    });
  }
});
