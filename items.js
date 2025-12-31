// items.js - The Avatar & Item Database

AFRAME.registerComponent('item-display', {
  init: function () {
    // This creates a T-shirt shape
    if (this.el.classList.contains('tshirt')) {
      this.el.setAttribute('geometry', {primitive: 'box', width: 0.6, height: 0.7, depth: 0.1});
      this.el.setAttribute('material', {color: 'blue'});
    }
    // This creates a Guitar shape
    if (this.el.classList.contains('guitar')) {
      this.el.setAttribute('geometry', {primitive: 'cylinder', radius: 0.2, height: 0.1});
      this.el.setAttribute('material', {color: 'brown'});
    }
  }
});
