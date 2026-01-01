// VR Height and Spawn Logic (Update 1.3.2)
AFRAME.registerComponent('oculus-height-fix', {
  init: function () {
    this.el.sceneEl.addEventListener('enter-vr', () => {
      // Force position to Semi-Center inside the room
      this.el.setAttribute('position', {x: 2, y: 0, z: 3});
      console.log("Spawn point corrected. Standing height initialized."); [cite: 2025-12-31]
    });
  }
});

// Oculus Interaction & Button Mapping (Update 1.5.1 Memory)
AFRAME.registerComponent('oculus-interaction-handler', {
  init: function () {
    // VR Start Button logic (v1.5.1 requirement)
    this.el.addEventListener('abuttondown', () => {
      console.log("Oculus Button A: Game Starting...");
      // Add Mega Particle activation logic here for Update 1.6
    });

    // Grip for grabbing/peeking cards (v1.4 preparation)
    this.el.addEventListener('gripdown', () => {
      console.log("Grip Pressed: Card Interaction ready.");
    });
  }
});

// Auto-Sit and Table Logic (Memory: "When player moves to play game, they automatically sit")
AFRAME.registerComponent('table-trigger', {
  init: function () {
    this.el.addEventListener('click', () => {
      let rig = document.querySelector('#rig');
      let tablePos = this.el.getAttribute('position');
      let roomPos = this.el.parentElement.getAttribute('position');

      // Auto-Sit: Move player to the specific table edge
      rig.setAttribute('position', {
        x: roomPos.x + tablePos.x, 
        y: 0, 
        z: roomPos.z + tablePos.z + 1.2
      });
      
      console.log("Auto-Sit active: Getting cards..."); [cite: 2025-12-30]
      // Winning Player Highlight logic (Update 1.3) will hook here
    });
  }
});
