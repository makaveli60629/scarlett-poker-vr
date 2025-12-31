AFRAME.registerComponent('avatar-loader', {
  init: function () {
    // Set default skin if none exists
    if (!localStorage.getItem('skin')) {
      localStorage.setItem('skin', '#ffccaa');
    }
    this.buildAvatar();
    
    // Force hands to refresh their color after 1 second to ensure they loaded
    setTimeout(() => this.updateHands(), 1000);
  },

  updateHands: function() {
    const skin = localStorage.getItem('skin');
    const hands = document.querySelectorAll('[hand-controls]');
    hands.forEach(h => {
      // This makes the hands visible and colored
      h.setAttribute('material', {color: skin, roughness: 0.5});
    });
  },

  buildAvatar: function () {
    const head = this.el;
    const skin = localStorage.getItem('skin');
    const face = document.createElement('a-sphere');
    face.setAttribute('radius', '0.2');
    face.setAttribute('color', skin);
    head.appendChild(face);
  }
});

AFRAME.registerComponent('wrist-watch', {
  init: function () {
    // Menu logic (Press X or Menu on left controller)
    this.el.addEventListener('model-loaded', () => {
        console.log("Hand model loaded - Watch ready");
    });
  }
});
