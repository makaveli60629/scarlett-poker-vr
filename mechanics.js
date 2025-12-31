// mechanics.js - Master Logic (Update 1.4)

// 1. HAPTIC FEEDBACK (Vibration)
function pulse(hand, intensity = 0.6, duration = 100) {
    const ctrl = document.querySelector(`[oculus-touch-controls="hand: ${hand}"]`);
    if (ctrl && ctrl.components['oculus-touch-controls'].gamepad) {
        ctrl.components['oculus-touch-controls'].gamepad.hapticActuators[0].pulse(intensity, duration);
    }
}

// 2. TV REMOTE LOGIC
AFRAME.registerComponent('tv-controls', {
  init: function () {
    const video = document.querySelector('#sports-stream');
    this.el.addEventListener('click', () => {
      pulse('right');
      video.paused ? video.play() : video.pause();
    });
  }
});

// 3. TOP-OFF CHIP LOGIC
AFRAME.registerComponent('top-off-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      pulse('right', 0.8, 150);
      let wallet = parseInt(localStorage.getItem('chips')) || 1000;
      if (wallet >= 500) {
          localStorage.setItem('chips', wallet - 500);
          alert("Topped off $500 from Wallet!");
      } else {
          alert("Insufficient Wallet Funds!");
      }
    });
  }
});

// 4. WALLET HOLOGRAM SYNC
AFRAME.registerComponent('wallet-sync', {
  tick: function () {
    const display = document.querySelector('#wallet-hologram');
    if (display) {
      const bal = localStorage.getItem('chips') || "1,000";
      display.setAttribute('value', `YOUR WALLET: $${bal}`);
    }
  }
});

// 5. GAZE SCOUTING
AFRAME.registerComponent('scout-logic', {
  init: function () {
    const scoutDisplay = this.el.querySelector('.scout-display');
    this.el.addEventListener('mouseenter', () => {
      this.timer = setTimeout(() => {
        if (scoutDisplay) scoutDisplay.setAttribute('visible', 'true');
      }, 3000);
    });
    this.el.addEventListener('mouseleave', () => {
      clearTimeout(this.timer);
      if (scoutDisplay) scoutDisplay.setAttribute('visible', 'false');
    });
  }
});

window.addEventListener('load', () => {
  document.querySelectorAll('.scoutable').forEach(b => b.setAttribute('scout-logic', ''));
});
