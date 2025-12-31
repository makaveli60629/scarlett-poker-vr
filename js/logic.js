// 1. AUTO-SIT & DEALER RECOGNITION
AFRAME.registerComponent('auto-sit-logic', {
  tick: function () {
    var playerEl = document.querySelector('#rig');
    var playerPos = playerEl.getAttribute('position');
    var zonePos = {x: 0, y: 0, z: -6.2}; 
    
    var distance = Math.sqrt(Math.pow(playerPos.x - zonePos.x, 2) + Math.pow(playerPos.z - zonePos.z, 2));

    if (distance < 1.0 && !this.isSeated) {
      this.isSeated = true;
      this.sitDown();
    }
  },
  sitDown: function () {
    document.querySelector('#rig').setAttribute('position', '0 0 -6.2');
    // Scarlett Dealer "speaks"
    alert("Scarlett: Welcome back, Makaveli 62629. Dealing your hand.");
    this.el.sceneEl.emit('dealCards');
  }
});

// 2. VIP DOOR WITH "WHOOSH" SOUND LOGIC
AFRAME.registerComponent('vip-door-logic', {
  tick: function () {
    var playerPos = document.querySelector('#rig').getAttribute('position');
    var doorPos = this.el.object3D.position;
    var distance = playerPos.distanceTo(doorPos);
    var wallet = parseInt(localStorage.getItem('poker_wallet')) || 0;

    if (distance < 2.5) {
      if (wallet >= 5000) {
        this.el.setAttribute('position', {x: 4, y: 1.5, z: -6}); // Slide open
        this.el.setAttribute('material', 'emissive', '#00FF00');
      } else {
        this.el.setAttribute('material', 'color', '#FF0000');
      }
    } else {
      this.el.setAttribute('position', {x: 4, y: 1.5, z: -4.9}); // Slide shut
    }
  }
});

// 3. DYNAMIC CHIP STACK (Visually represents your wallet)
AFRAME.registerComponent('chip-stack-logic', {
  init: function () {
    this.updateStacks();
    window.addEventListener('walletUpdated', () => this.updateStacks());
  },
  updateStacks: function () {
    this.el.innerHTML = ''; // Clear old stacks
    let wallet = parseInt(localStorage.getItem('poker_wallet')) || 0;
    let numChips = Math.min(Math.floor(wallet / 500), 10); // 1 chip per $500

    for (let i = 0; i < numChips; i++) {
      let chip = document.createElement('a-cylinder');
      chip.setAttribute('radius', '0.1');
      chip.setAttribute('height', '0.02');
      chip.setAttribute('position', `0 ${i * 0.025} 0`);
      chip.setAttribute('color', i % 2 === 0 ? 'red' : 'white');
      this.el.appendChild(chip);
    }
  }
});

// 4. GIVEAWAY LOGIC
AFRAME.registerComponent('daily-giveaway-box', {
  init: function () {
    this.el.addEventListener('click', () => {
      let balance = parseInt(localStorage.getItem('poker_wallet')) || 1000;
      balance += 500;
      localStorage.setItem('poker_wallet', balance);
      window.dispatchEvent(new Event('walletUpdated'));
      alert("Makaveli 62629: +500 Chips Added. Check your hologram!");
    });
  }
});
