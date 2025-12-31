AFRAME.registerComponent('auto-sit-logic', {
  tick: function () {
    var playerEl = document.querySelector('#rig');
    var playerPos = playerEl.getAttribute('position');
    var zonePos = this.el.object3D.position;
    
    // Check if player moved to "Play Game"
    var distance = Math.sqrt(
      Math.pow(playerPos.x - zonePos.x, 2) + 
      Math.pow(playerPos.z - (zonePos.z - 8), 2) // Offset for table position
    );

    if (distance < 1.0 && !this.isSeated) {
      this.isSeated = true;
      this.sitDown();
    }
  },
  sitDown: function () {
    console.log("Automatically sitting player and dealing cards...");
    // Move player to seated position
    document.querySelector('#rig').setAttribute('position', '0 0 -6.5');
    // Trigger card dealing
    this.el.sceneEl.emit('dealCards');
    alert("Seated. Cards Dealt. (Dismiss notification in browser)");
  }
});

AFRAME.registerComponent('daily-giveaway-box', {
  init: function () {
    this.el.addEventListener('click', () => {
      let balance = parseInt(localStorage.getItem('poker_wallet')) || 1000;
      balance += 500;
      localStorage.setItem('poker_wallet', balance);
      window.dispatchEvent(new Event('walletUpdated'));
      alert("Added 500 Blue Chips!");
    });
  }
});
