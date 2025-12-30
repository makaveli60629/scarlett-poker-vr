// table-game.js
// Handles VR poker table, card dealing, chip placement, and player/bot interactions

AFRAME.registerComponent('table-game', {
  schema: {
    players: {type: 'int', default: 6},  // total seats
    chipsStart: {type: 'int', default: 50000} // starting chips
  },
  
  init: function() {
    this.pot = 0;
    this.currentTurn = 0;
    this.deck = this.shuffleDeck();
    this.playerHands = Array(this.data.players).fill(null).map(()=>[]);
    this.playerChips = Array(this.data.players).fill(this.data.chipsStart);
    this.tableChips = Array(this.data.players).fill(0);
    this.createTable();
    this.dealCards();
    this.setupHoverCards();
  },

  // Create table and chip/card positions
  createTable: function() {
    const table = document.createElement('a-cylinder');
    table.setAttribute('position', '0 0 0');
    table.setAttribute('radius', '3.5');
    table.setAttribute('height', '0.5');
    table.setAttribute('color', '#1a110a');
    table.setAttribute('material', 'metalness:0.4; roughness:0.2');
    this.el.appendChild(table);

    // Add chips positions
    for(let i=0;i<this.data.players;i++){
      const angle = (i/this.data.players)*360;
      const x = 3 * Math.sin(angle*Math.PI/180);
      const z = 3 * Math.cos(angle*Math.PI/180);
      const chip = document.createElement('a-cylinder');
      chip.setAttribute('position', `${x} 0.3 ${z}`);
      chip.setAttribute('radius', '0.2');
      chip.setAttribute('height', '0.1');
      chip.setAttribute('color', 'gold');
      chip.setAttribute('id', `chip-${i}`);
      this.el.appendChild(chip);
    }
  },

  // Shuffle a standard 52-card deck
  shuffleDeck: function() {
    const suits = ['H','D','C','S'];
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    let deck = [];
    suits.forEach(suit=>{
      values.forEach(val=>{
        deck.push({suit: suit, value: val});
      });
    });
    for (let i=deck.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [deck[i],deck[j]]=[deck[j],deck[i]];
    }
    return deck;
  },

  // Deal 2 cards to each player
  dealCards: function() {
    for(let p=0;p<this.data.players;p++){
      this.playerHands[p].push(this.deck.pop(), this.deck.pop());
      this.renderPlayerCards(p);
    }
  },

  // Render cards in VR
  renderPlayerCards: function(playerIndex){
    const angle = (playerIndex/this.data.players)*360;
    const x = 2.5 * Math.sin(angle*Math.PI/180);
    const z = 2.5 * Math.cos(angle*Math.PI/180);
    const y = 1.2;
    
    // Remove previous cards if exist
    const oldCards = document.querySelectorAll(`.card-${playerIndex}`);
    oldCards.forEach(c=>c.parentNode.removeChild(c));

    this.playerHands[playerIndex].forEach((card,i)=>{
      const cardEntity = document.createElement('a-box');
      cardEntity.setAttribute('position', `${x} ${y} ${z+i*0.05}`);
      cardEntity.setAttribute('depth', '0.02');
      cardEntity.setAttribute('height', '0.6');
      cardEntity.setAttribute('width', '0.4');
      cardEntity.setAttribute('color', '#fff');
      cardEntity.setAttribute('class', `card card-${playerIndex} clickable`);
      cardEntity.setAttribute('material', 'metalness:0.2; roughness:0.5');
      cardEntity.setAttribute('look-at', '[camera]');
      this.el.appendChild(cardEntity);
    });
  },

  // Enable hover effect for player's own cards
  setupHoverCards: function() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card=>{
      card.addEventListener('mouseenter', ()=>{
        card.setAttribute('scale', '1.2 1.2 1.2');
      });
      card.addEventListener('mouseleave', ()=>{
        card.setAttribute('scale', '1 1 1');
      });
    });
  },

  // Handle player bets
  playerBet: function(playerIndex, amount){
    if(this.playerChips[playerIndex] >= amount){
      this.playerChips[playerIndex] -= amount;
      this.pot += amount;
      this.tableChips[playerIndex] += amount;
      document.querySelector(`#chip-${playerIndex}`).setAttribute('color', 'orange');
      console.log(`Player ${playerIndex} bets ${amount}. Pot: ${this.pot}`);
    }
  },

  // Next turn
  nextTurn: function(){
    this.currentTurn = (this.currentTurn + 1) % this.data.players;
  }
});
