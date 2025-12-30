// File: core/table-game.js

let currentPot = 0;
let players = [];
let aiPlayers = [];
let deck = [];

// Generate a deck
function generateDeck() {
  const suits = ['♠','♥','♦','♣'];
  const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  deck = [];
  for(let s of suits){
    for(let v of values){
      deck.push({suit: s, value: v});
    }
  }
  shuffleDeck();
}

// Shuffle deck
function shuffleDeck() {
  for(let i=deck.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// Initialize players
function initPlayers() {
  players = [{name:'You', hand: [], chips:1000}];
  for(let i=0; i<5; i++){
    aiPlayers.push({name:`AI-${i+1}`, hand: [], chips:1000});
  }
}

// Deal cards
function dealCards() {
  for(let p of players.concat(aiPlayers)){
    p.hand = [];
    p.hand.push(deck.pop());
    p.hand.push(deck.pop());
  }
  updateTableCards();
}

// Update cards on table
function updateTableCards() {
  // Player cards
  players.forEach((p, idx)=>{
    let cardEl1 = document.querySelector(`#player-card-${idx*2}`);
    let cardEl2 = document.querySelector(`#player-card-${idx*2+1}`);
    cardEl1.setAttribute('value', `${p.hand[0].value}${p.hand[0].suit}`);
    cardEl2.setAttribute('value', `${p.hand[1].value}${p.hand[1].suit}`);
  });

  // AI cards (face down)
  aiPlayers.forEach((ai, idx)=>{
    let cardEl1 = document.querySelector(`#ai-card-${idx*2}`);
    let cardEl2 = document.querySelector(`#ai-card-${idx*2+1}`);
    cardEl1.setAttribute('value', '??');
    cardEl2.setAttribute('value', '??');
  });
}

// Add chips to pot
function addToPot(amount){
  if(amount > players[0].chips) amount = players[0].chips;
  players[0].chips -= amount;
  currentPot += amount;
  document.querySelector('#pot-text').setAttribute('value', `TOTAL POT: $${currentPot}`);
  document.querySelector('#pot-text').emit('pot-updated');
}

// AI Betting Logic
function aiBettingRound() {
  aiPlayers.forEach(ai=>{
    if(ai.chips <= 0) return;
    let bet = Math.min(Math.floor(Math.random()*50)+10, ai.chips);
    ai.chips -= bet;
    currentPot += bet;
  });
  document.querySelector('#pot-text').setAttribute('value', `TOTAL POT: $${currentPot}`);
}

// Reset table for next round
function resetTable() {
  currentPot = 0;
  document.querySelector('#pot-text').setAttribute('value', `TOTAL POT: $${currentPot}`);
  generateDeck();
  dealCards();
}

// Hover animation component
AFRAME.registerComponent('hover-animate', {
  schema: { type: 'string' },
  init: function () {
    const el = this.el;
    const type = this.data;
    el.addEventListener('mouseenter', () => {
      if(type==='card'){
        el.setAttribute('animation__hover', {property:'position', to:{x:el.object3D.position.x,y:el.object3D.position.y+0.2,z:el.object3D.position.z}, dur:300});
        el.setAttribute('animation__rotate', {property:'rotation', to:{x:0,y:180,z:0}, dur:400});
      }
      if(type==='chip'){
        el.setAttribute('animation__hover', {property:'position', to:{x:el.object3D.position.x,y:el.object3D.position.y+0.1,z:el.object3D.position.z}, dur:300});
      }
    });
    el.addEventListener('mouseleave', () => {
      el.removeAttribute('animation__hover');
      el.removeAttribute('animation__rotate');
      el.setAttribute('position', el.getAttribute('position'));
    });
  }
});

// Pot glow component
AFRAME.registerComponent('pot-glow', {
  schema: { color: {type:'color', default:'#ff0'}, duration: {type:'int', default:500} },
  init: function () {
    const el = this.el;
    el.addEventListener('pot-updated', () => {
      const original = el.getAttribute('color');
      el.setAttribute('color', this.data.color);
      setTimeout(()=>el.setAttribute('color', original), this.data.duration);
    });
  }
});

// Initialize everything
window.addEventListener('load', ()=>{
  generateDeck();
  initPlayers();
  dealCards();
});
