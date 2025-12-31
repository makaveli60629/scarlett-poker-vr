AFRAME.registerComponent('avatar-loader', {
  init: function () {
    if (!localStorage.getItem('avatar_init')) { this.randomize(); }
    this.buildAvatar();
    this.el.addEventListener('refreshAvatar', () => {
      while (this.el.firstChild) { this.el.removeChild(this.el.firstChild); }
      this.buildAvatar();
      this.updateHandColor();
    });
    this.updateHandColor();
  },
  randomize: function() {
    const skins = ['#ffccaa', '#8d5524', '#c58c85'];
    localStorage.setItem('skin', skins[Math.floor(Math.random()*skins.length)]);
    localStorage.setItem('gender', Math.random() > 0.5 ? 'male' : 'female');
    localStorage.setItem('avatar_init', 'true');
  },
  updateHandColor: function() {
    const skin = localStorage.getItem('skin');
    document.querySelectorAll('[hand-controls]').forEach(h => h.setAttribute('material', 'color', skin));
  },
  buildAvatar: function () {
    const skin = localStorage.getItem('skin');
    const face = document.createElement('a-sphere');
    face.setAttribute('radius', '0.2');
    face.setAttribute('color', skin);
    this.el.appendChild(face);
  }
});

AFRAME.registerComponent('wrist-watch', {
  init: function () {
    this.menu = document.createElement('a-entity');
    this.menu.setAttribute('visible', 'false');
    this.menu.setAttribute('position', '0 0.1 0');
    
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '0.4'); bg.setAttribute('height', '0.5');
    bg.setAttribute('color', '#111'); bg.setAttribute('opacity', '0.9');
    
    this.text = document.createElement('a-text');
    this.text.setAttribute('align', 'center');
    this.text.setAttribute('position', '0 0.1 0.01');
    this.text.setAttribute('width', '1');
    
    const exitBtn = document.createElement('a-box');
    exitBtn.setAttribute('width', '0.3'); exitBtn.setAttribute('height', '0.08');
    exitBtn.setAttribute('position', '0 -0.15 0.01'); exitBtn.setAttribute('color', 'red');
    exitBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

    this.menu.appendChild(bg); this.menu.appendChild(this.text); this.menu.appendChild(exitBtn);
    this.el.appendChild(this.menu);

    window.addEventListener('xbuttondown', () => {
      const v = !this.menu.getAttribute('visible');
      this.menu.setAttribute('visible', v);
      if(v) this.text.setAttribute('value', `CHIPS: $${localStorage.getItem('chips') || 1000}`);
    });
  }
});
