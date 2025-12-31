// WINNER CELEBRATION
function showWinner(name, handType) {
    const text = document.createElement('a-entity');
    text.setAttribute('position', '100 2.5 100');
    text.setAttribute('text', {
        value: name + " WINS WITH A " + handType,
        align: 'center',
        width: 6,
        color: 'gold'
    });
    
    // Highlight winning player
    document.querySelector('#rig').setAttribute('animation', 'property: light.intensity; to: 3; dur: 500; dir: alternate; loop: 4');
    
    document.querySelector('a-scene').appendChild(text);
    
    // Remove after 10 seconds
    setTimeout(() => { if(text.parentNode) text.parentNode.removeChild(text); }, 10000);
}

// MAGNETIC GRABBER
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

// DAILY PICK
AFRAME.registerComponent('daily-pick-logic', {
  init: function () {
    this.el.addEventListener('click', () => {
      const win = (Math.floor(Math.random() * 10) + 1) * 500;
      let wallet = parseInt(localStorage.getItem('poker_wallet')) || 1000;
      wallet += win;
      localStorage.setItem('poker_wallet', wallet);
      alert("WIN: $" + win);
      this.el.setAttribute('visible', 'false');
    });
  }
});
