// File: core/table-game.js

// Hover animations for cards and chips
AFRAME.registerComponent('hover-animate', {
  schema: { type: 'string' },
  init: function () {
    const el = this.el;
    const type = this.data;

    el.addEventListener('mouseenter', () => {
      if(type === 'card'){
        el.setAttribute('animation__hover', {
          property: 'position',
          to: {x: el.object3D.position.x, y: el.object3D.position.y + 0.2, z: el.object3D.position.z},
          dur: 300,
          easing: 'easeOutQuad'
        });
        el.setAttribute('animation__rotate', {
          property: 'rotation',
          to: {x: 0, y: 180, z: 0},
          dur: 400,
          easing: 'easeOutQuad'
        });
      } else if(type === 'chip'){
        el.setAttribute('animation__hover', {
          property: 'position',
          to: {x: el.object3D.position.x, y: el.object3D.position.y + 0.1, z: el.object3D.position.z},
          dur: 300,
          easing: 'easeOutQuad'
        });
      }
    });

    el.addEventListener('mouseleave', () => {
      el.removeAttribute('animation__hover');
      el.removeAttribute('animation__rotate');
      el.setAttribute('position', el.getAttribute('position'));
    });
  }
});

// Pot glow when chips are added
AFRAME.registerComponent('pot-glow', {
  schema: { color: {type:'color', default:'#ff0'}, duration: {type:'int', default:500} },
  init: function () {
    const el = this.el;
    el.addEventListener('pot-updated', () => {
      const original = el.getAttribute('color');
      el.setAttribute('color', this.data.color);
      setTimeout(() => {
        el.setAttribute('color', original);
      }, this.data.duration);
    });
  }
});

// Example function to add chips to pot
let currentPot = 0;
function addToPot(amount){
  currentPot += amount;
  document.querySelector('#pot-text').setAttribute('value', `TOTAL POT: $${currentPot}`);
  document.querySelector('#pot-text').emit('pot-updated');
}
