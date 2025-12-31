let turnInterval;
let timeLeft = 30;

function showHUD(msg) {
    const hud = document.querySelector('#hud-msg');
    const text = document.querySelector('#hud-text');
    text.setAttribute('value', msg);
    hud.setAttribute('visible', 'true');
    setTimeout(() => { hud.setAttribute('visible', 'false'); }, 4000);
}

function startTurnTimer() {
    timeLeft = 30;
    const timerDisplay = document.querySelector('#turn-timer-display');
    timerDisplay.setAttribute('visible', 'true');
    
    if(turnInterval) clearInterval(turnInterval);
    
    turnInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.setAttribute('value', "YOUR TURN: " + timeLeft + "s");
        
        if(timeLeft <= 0) {
            clearInterval(turnInterval);
            timerDisplay.setAttribute('visible', 'false');
            showHUD("Time Out! Makaveli Checked.");
        }
    }, 1000);
}

function announceWinner() {
    const winDisp = document.querySelector('#winner-display');
    winDisp.setAttribute('visible', 'true');
    showHUD("MAKAVELI 60629 WINS THE POT!");
    
    // Reward Logic
    let wallet = parseInt(localStorage.getItem('poker_wallet')) || 1000;
    wallet += 2500;
    localStorage.setItem('poker_wallet', wallet);
    window.dispatchEvent(new Event('walletUpdated'));

    setTimeout(() => { winDisp.setAttribute('visible', 'false'); }, 6000);
}

function dealCard() {
    let card = document.createElement('a-box');
    card.setAttribute('width', '0.15'); card.setAttribute('height', '0.01'); card.setAttribute('depth', '0.22');
    card.setAttribute('position', '0 1 -11.5');
    card.setAttribute('animation', {
        property: 'position', to: '0 0.8 -8.5', dur: 800, easing: 'easeOutQuad'
    });
    document.querySelector('a-scene').appendChild(card);
}

AFRAME.registerComponent('auto-sit-logic', {
  init: function() {
    this.el.addEventListener('click', () => {
      document.querySelector('#rig').setAttribute('position', '0 -0.4 -8.2'); 
      showHUD("Seated. Dealing 1.3 Cards...");
      dealCard();
      setTimeout(dealCard, 400);
      setTimeout(startTurnTimer, 1200);
      
      // Demo: Show a winner after 10 seconds
      setTimeout(announceWinner, 10000);
    });
  }
});

AFRAME.registerComponent('boundary-check', {
  tick: function () {
    var pos = this.el.getAttribute('position');
    if (pos.y < -1 || Math.abs(pos.x) > 20) {
      this.el.setAttribute('position', '0 0 0');
    }
  }
});
