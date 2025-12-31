// mechanics.js - The Permanent Brain
// Handles: Movement, Sitting, and Scene Transitions

AFRAME.registerComponent('auto-sit', {
  init: function () {
    this.el.addEventListener('click', () => {
      const rig = document.querySelector('#rig');
      rig.setAttribute('position', this.el.getAttribute('data-sit-pos'));
      rig.setAttribute('movement-controls', 'enabled: false');
    });
  }
});

AFRAME.registerComponent('door-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      this.el.setAttribute('animation', 'property: rotation; to: 0 90 0; dur: 1000');
      setTimeout(() => { window.location.href = 'store.html'; }, 1000);
    });
  }
});

AFRAME.registerComponent('buy-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      const itemName = this.el.getAttribute('data-item');
      alert("You bought: " + itemName);
      // Logic to save item to player memory
      localStorage.setItem(itemName, "owned");
      this.el.setAttribute('color', 'gold');
    });
  }
});
