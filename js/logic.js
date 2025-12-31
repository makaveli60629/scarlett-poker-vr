// MAGNETIC SNAP: Holds card when you click it
AFRAME.registerComponent('magnetic-grabber', {
  init: function () {
    this.el.addEventListener('click', (evt) => {
      let target = evt.detail.intersection.object.el;
      if (target.classList.contains('community-card')) {
        target.setAttribute('position', '0.2 -0.2 -0.5'); // Snap to hand view
        this.el.appendChild(target); 
        showHUD("CARD GRABBED");
      }
    });
  }
});

// HOVER PEEK: 2 seconds looking at cards makes them fly up
AFRAME.registerComponent('hover-peek', {
  init: function () {
    let timer;
    this.el.addEventListener('mouseenter', () => {
      timer = setTimeout(() => {
        this.el.setAttribute('animation', {
          property: 'position',
          to: `${this.el.object3D.position.x} 1.5 ${this.el.object3D.position.z}`,
          dur: 1000,
          easing: 'easeOutElastic'
        });
        showHUD("PEEKING AT CARDS");
      }, 2000); // 2 Seconds
    });
    this.el.addEventListener('mouseleave', () => {
      clearTimeout(timer);
    });
  }
});

// SHIRT SWAPPER
AFRAME.registerComponent('shirt-swap', {
  schema: { color: {type: 'string'} },
  init: function () {
    this.el.addEventListener('click', () => {
      document.querySelector('#my-worn-shirt').setAttribute('color', this.data.color);
      showHUD("SHIRT CHANGED TO " + this.data.color.toUpperCase());
    });
  }
});

// REWARD SYSTEM (Repeated Logic)
AFRAME.registerComponent('daily-pick-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      const amounts = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];
      const win = amounts[Math.floor(Math.random() * amounts.length)];
      let wallet = parseInt(localStorage.getItem('poker_wallet')) || 1000;
      wallet += win;
      localStorage.setItem('poker_wallet', wallet);
      window.dispatchEvent(new Event('walletUpdated'));
      showHUD("WON $" + win + " FROM DAILY PICK!");
    });
  }
});

function showHUD(msg) {
    const hud = document.querySelector('#hud-msg');
    const text = document.querySelector('#hud-text');
    text.setAttribute('value', msg);
    hud.setAttribute('visible', 'true');
    setTimeout(() => { hud.setAttribute('visible', 'false'); }, 3000);
}
