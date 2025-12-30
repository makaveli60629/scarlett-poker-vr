// File: core/vr-chip.js

AFRAME.registerComponent('grab-chip', {
  schema: {
    value: {type:'int', default:100} // default chip value
  },
  init: function () {
    const el = this.el;
    el.setAttribute('grabbable', ''); // make it grab-ready
    el.addEventListener('grab-end', evt => {
      const handEl = evt.detail.hand; // hand that released the chip
      const potEl = document.querySelector('#pot'); // your pot entity
      const chipValue = this.data.value;

      // Check if chip is near pot
      const chipPos = el.object3D.position;
      const potPos = potEl.object3D.position;
      const distance = chipPos.distanceTo(potPos);

      if(distance < 0.3){ // adjust radius for grabbing
        addToPot(chipValue); // table-game.js function
        // Move chip visually into pot
        el.setAttribute('animation__toPot', {
          property:'position',
          to:`${potPos.x} ${potPos.y} ${potPos.z}`,
          dur:300
        });
        setTimeout(() => {
          el.parentNode.removeChild(el); // remove chip after placing
        }, 350);
      } else {
        // Optional: animate chip back to original place
        el.setAttribute('animation__return', {
          property:'position',
          to:el.getAttribute('position'),
          dur:300
        });
      }
    });
  }
});

// Spawn chips dynamically for the player
function spawnPlayerChips() {
  const chipValues = [10, 50, 100, 500]; // create chip denominations
  const uiEl = document.querySelector('#player-chips'); // wrist or table UI
  chipValues.forEach((val, idx) => {
    const chipEl = document.createElement('a-cylinder');
    chipEl.setAttribute('id', `chip-${val}`);
    chipEl.setAttribute('color', '#f00'); // customize color
    chipEl.setAttribute('height', '0.02');
    chipEl.setAttribute('radius', '0.05');
    chipEl.setAttribute('position', {x: idx*0.1, y:0.05, z:0});
    chipEl.setAttribute('grab-chip', {value: val});
    chipEl.setAttribute('hover-animate', 'chip');
    uiEl.appendChild(chipEl);
  });
}

// Call this after table loads
window.addEventListener('load', () => {
  spawnPlayerChips();
});
