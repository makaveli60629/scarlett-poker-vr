AFRAME.registerComponent('magnetic-grabber', {
  init: function () {
    this.el.addEventListener('click', (evt) => {
      let obj = evt.detail.intersection.object.el;
      if (obj.classList.contains('poker-card')) {
        obj.setAttribute('position', '0.1 -0.1 -0.3');
        this.el.appendChild(obj);
      }
    });
  }
});

AFRAME.registerComponent('poker-card-physics', {
  init: function () {
    let timer;
    this.el.addEventListener('mouseenter', () => {
      timer = setTimeout(() => {
        this.el.setAttribute('animation', {property: 'position', to: '0 1.5 -1', dur: 1000});
        this.el.setAttribute('animation__rot', {property: 'rotation', to: '0 0 180', dur: 1000});
      }, 2000);
    });
    this.el.addEventListener('mouseleave', () => clearTimeout(timer));
  }
});

AFRAME.registerComponent('teleport-logic', {
  schema: { target: {type: 'vec3'} },
  init: function () {
    this.el.addEventListener('click', () => {
      document.querySelector('#rig').setAttribute('position', this.data.target);
    });
  }
});

AFRAME.registerComponent('daily-pick-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      const win = (Math.floor(Math.random() * 10) + 1) * 500;
      let wallet = parseInt(localStorage.getItem('poker_wallet')) || 1000;
      wallet += win;
      localStorage.setItem('poker_wallet', wallet);
      window.dispatchEvent(new Event('walletUpdated'));
      alert("CASHED OUT: $" + win);
      this.el.setAttribute('visible', 'false');
    });
  }
});
