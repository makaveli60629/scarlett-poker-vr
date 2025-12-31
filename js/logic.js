// DAILY PICK LOGIC - UP TO $5000
AFRAME.registerComponent('daily-pick-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      // Random win in $500 increments up to $5000
      const multipliers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const win = multipliers[Math.floor(Math.random() * multipliers.length)] * 500;
      
      let wallet = parseInt(localStorage.getItem('poker_wallet')) || 1000;
      wallet += win;
      localStorage.setItem('poker_wallet', wallet);
      
      // Visual feedback
      alert("YOU CLAIMED: $" + win);
      this.el.setAttribute('visible', 'false');
    });
  }
});

// TELEPORT LOGIC
AFRAME.registerComponent('teleport-logic', {
  schema: { target: { type: 'vec3' } },
  init: function () {
    this.el.addEventListener('click', () => {
      document.querySelector('#rig').setAttribute('position', this.data.target);
    });
  }
});

// MAGNETIC GRABBER FOR CARDS
AFRAME.registerComponent('magnetic-grabber', {
  init: function () {
    this.el.addEventListener('click', (evt) => {
      let target = evt.detail.intersection.object.el;
      if (target.classList.contains('poker-card')) {
        target.setAttribute('position', '0.1 -0.1 -0.2');
        this.el.appendChild(target);
      }
    });
  }
});
