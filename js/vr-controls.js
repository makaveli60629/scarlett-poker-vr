AFRAME.registerComponent('play-game-zone', {
  init: function () {
    this.el.addEventListener('raycaster-intersected', evt => {
      this.raycaster = evt.detail.el;
    });
  },
  tick: function () {
    const rig = document.querySelector('#rig');
    const playerPos = rig.getAttribute('position');
    const tablePos = this.el.getAttribute('position');
    
    // Auto-Sit Logic: Distance Check
    let dist = playerPos.distanceTo(tablePos);
    if (dist < 2) {
        // Move rig to seated position
        rig.setAttribute('position', {x: tablePos.x, y: 0, z: tablePos.z + 1});
        console.log("Player Seated - Dealing Cards...");
        // Trigger card deal logic from game-logic.js
        if(window.gameEngine) window.gameEngine.dealHand();
    }
  }
});
