// mechanics.js - The Logic Engine

// 1. AUTO-SIT
AFRAME.registerComponent('auto-sit', {
  init: function () {
    this.el.addEventListener('click', () => {
      const rig = document.querySelector('#rig');
      rig.setAttribute('position', this.el.getAttribute('data-sit-pos'));
      rig.setAttribute('movement-controls', 'enabled: false');
    });
  }
});

// 2. DOOR TRANSITION
AFRAME.registerComponent('door-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      this.el.setAttribute('animation', 'property: rotation; to: 0 90 0; dur: 1000');
      setTimeout(() => { window.location.href = 'store.html'; }, 1000);
    });
  }
});

// 3. BUY & EQUIP SYSTEM
AFRAME.registerComponent('buy-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      localStorage.setItem(this.el.getAttribute('data-item'), "owned");
      alert("Item Purchased! Check your Closet.");
    });
  }
});

AFRAME.registerComponent('equip-logic', {
  init: function () {
    // Hide item in closet if not owned
    if (localStorage.getItem(this.el.getAttribute('data-item')) !== "owned") {
      this.el.setAttribute('visible', 'false');
    }
    this.el.addEventListener('click', () => {
      alert("Item Equipped!");
    });
  }
});
