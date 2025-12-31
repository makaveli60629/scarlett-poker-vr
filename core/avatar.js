// avatar.js - Floating Busts & Wrist Store

AFRAME.registerComponent('avatar-loader', {
  init: function () {
    const skin = localStorage.getItem('skin') || '#ffccaa';
    
    // HEAD & EYES
    const head = document.createElement('a-sphere');
    head.setAttribute('radius', '0.22');
    head.setAttribute('color', skin);
    
    const eyeL = document.createElement('a-sphere');
    eyeL.setAttribute('radius', '0.02'); eyeL.setAttribute('color', 'black');
    eyeL.setAttribute('position', '-0.07 0.05 -0.2');
    head.appendChild(eyeL);

    // FLOATING BUST (Neck & Torso)
    const torso = document.createElement('a-cone');
    torso.setAttribute('radius-bottom', '0.35');
    torso.setAttribute('radius-top', '0.1');
    torso.setAttribute('height', '0.6');
    torso.setAttribute('position', '0 -0.5 0');
    torso.setAttribute('color', '#2c3e50'); // Branded Vest Color

    this.el.appendChild(head);
    this.el.appendChild(torso);

    // BLINKING LOGIC
    setInterval(() => {
        eyeL.setAttribute('scale', '1 0.1 1');
        setTimeout(() => { eyeL.setAttribute('scale', '1 1 1'); }, 150);
    }, 4000);
  }
});

AFRAME.registerComponent('wrist-watch', {
  init: function () {
    this.menu = document.createElement('a-entity');
    this.menu.setAttribute('visible', 'false');
    this.menu.setAttribute('position', '0 0.25 0');
    
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '0.5'); bg.setAttribute('height', '0.6'); bg.setAttribute('color', '#111');
    
    const storeTxt = document.createElement('a-text');
    storeTxt.setAttribute('value', 'WATCH STORE\n\n- VIP SUBSCRIPTION\n- CHIP PACKS\n- BADGES');
    storeTxt.setAttribute('align', 'center'); storeTxt.setAttribute('width', '1.2');
    
    this.menu.appendChild(bg); this.menu.appendChild(storeTxt);
    this.el.appendChild(this.menu);

    window.addEventListener('xbuttondown', () => {
      this.menu.setAttribute('visible', !this.menu.getAttribute('visible'));
    });
  }
});
