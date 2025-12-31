// MAGNETIC SNAP-TO-SEAT LOGIC
AFRAME.registerComponent('snap-sit', {
  schema: { pos: { type: 'string' } },
  init: function () {
    this.el.addEventListener('click', () => {
      const rig = document.querySelector('#rig');
      const coords = this.data.pos.split(' ');
      
      // Snap Player to Table Height and Location
      rig.setAttribute('position', { 
        x: parseFloat(coords[0]), 
        y: parseFloat(coords[1]), 
        z: parseFloat(coords[2]) 
      });
      
      // Lock movement controls while seated
      rig.setAttribute('movement-controls', 'enabled', false);
      
      console.log("Player seated. Game starting...");
    });
  }
});

// DAILY PICK REWARD LOGIC ($500 - $5000)
AFRAME.registerComponent('daily-pick-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      const increments = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];
      const win = increments[Math.floor(Math.random() * increments.length)];
      
      // Browser notification fix
      if (confirm("You won $" + win + "! Click OK to claim.")) {
        console.log("Balance updated: +" + win);
      }
    });
  }
});
