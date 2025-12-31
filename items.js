// items.js - Item 3D Shapes

AFRAME.registerComponent('item-display', {
  init: function () {
    if (this.el.classList.contains('tshirt')) {
      this.el.setAttribute('geometry', {primitive: 'box', width: 0.5, height: 0.6, depth: 0.1});
      this.el.setAttribute('material', {color: this.el.getAttribute('data-color') || 'blue'});
    }
    if (this.el.classList.contains('guitar')) {
      this.el.setAttribute('geometry', {primitive: 'box', width: 0.1, height: 0.8, depth: 0.05});
    }
  }
});
