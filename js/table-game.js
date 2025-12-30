// table-game.js - Scarlett VR Poker Complete Table Logic

AFRAME.registerComponent('table-game', {
  schema: {
    playerChips: {type: 'int', default: 50000},
    botCount: {type: 'int', default: 5},
    minBet: {type: 'int', default: 500},
    maxBet: {type: 'int', default: 5000}
  },

  init: function () {
    this.pot = 0;
    this.currentBet = this.data.minBet;
    this.deck = this.createDeck();
    this.playerHand = [];
    this.botHands = Array(this.data.botCount).fill(null).map(()=>[]);
    this.botChips = Array(this.data.botCount).fill(50000);
    this.currentTurn = 0;
    this.playerActionInProgress = false;

    // HUD references
    this.potText = document.querySelector('#pot-text');
    this.wristCash = document.querySelector('#wrist-cash');

    // Deal initial cards
    this.dealCards();

    // Start first betting round
    this.startBettingRound();
  },

  // ----- DECK & CARD FUNCTIONS -----
  createDeck: function () {
    const suits = ['hearts','diamonds','clubs','spades'];
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    let deck = [];
    suits.forEach(suit => {
      values.forEach(value => {
        deck.push({suit,value});
      });
    });
    return this.shuffleDeck(deck);
  },

  shuffleDeck: function (deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  },

  dealCards: function () {
    // Deal 2 cards to player
    this.playerHand.push(this.deck.pop(), this.deck.pop());
    this.renderPlayerCards();

    // Deal 2 cards to each bot
    for (let i=0;i<this.data.botCount;i++){
      this.botHands[i].push(this.deck.pop(), this.deck.pop());
      this.renderBotCards(i);
    }

    // Reset pot
    this.pot = 0;
    this.updatePotHUD();
  },

  renderPlayerCards: function () {
    const handContainer = document.querySelector('#player-hand');
    if(handContainer) handContainer.innerHTML = ''; // clear previous
    this.playerHand.forEach((card,i)=>{
      const cardEntity = document.createElement('a-box');
      cardEntity.setAttribute('position', `${-0.4 + i*0.8} 1.2 -2`);
      cardEntity.setAttribute('depth','0.02');
      cardEntity.setAttribute('height','0.6');
      cardEntity.setAttribute('width','0.4');
      cardEntity.setAttribute('color','#fff');
      cardEntity.setAttribute('material','metalness:0.2; roughness:0.5');
      handContainer.appendChild(cardEntity);
    });
  },

  renderBotCards: function (botIndex) {
    const angle = ((botIndex+1)/6)*360; 
    const x = 2.5 * Math.sin(angle*Math.PI/180);
    const z = 2.5 * Math.cos(angle*Math.PI/180);
    const y = 1.2;
    const oldCards = document.querySelectorAll(`.bot-card-${botIndex}`);
    oldCards.forEach(c=>c.parentNode.removeChild(c));

    this.botHands[botIndex].forEach((card,i)=>{
      const cardEntity = document.createElement('a-box');
      cardEntity.setAttribute('position', `${x} ${y} ${z+i*0.05}`);
      cardEntity.setAttribute('depth','0.02');
      cardEntity.setAttribute('height','0.6');
      cardEntity.setAttribute('width','0.4');
      cardEntity.setAttribute('color','#222'); // face-down for bots
      cardEntity.setAttribute('class', `bot-card bot-card-${botIndex}`);
      cardEntity.setAttribute('material','metalness:0.2; roughness:0.5');
      this.el.appendChild(cardEntity);
    });
  },

  // ----- HUD & POT -----
  updatePotHUD: function(){
    if(this.potText) this.potText.setAttribute('value', `TOTAL POT: $${this.pot}`);
    if(this.wristCash) this.wristCash.setAttribute('value', `BANK: $${this.data.playerChips}`);
  },

  addToPot: function(amount){
    this.pot += amount;
    this.updatePotHUD();
  },

  // ----- PLAYER ACTIONS -----
  playerBet: function(amount){
    if(this.playerActionInProgress) return;
    amount = Math.min(amount,this.data.playerChips);
    this.data.playerChips -= amount;
    this.addToPot(amount);
    this.playerActionInProgress = true;
    setTimeout(()=>{ this.playerActionInProgress=false; this.nextTurn(); }, 1000);
  },

  playerFold: function(){
    this.playerActionInProgress = true;
    console.log("Player folds");
    setTimeout(()=>{ this.playerActionInProgress=false; this.nextTurn(); }, 1000);
  },

  // ----- BOT ACTIONS -----
  botAction: function(botIndex){
    if(this.botChips[botIndex] <=0) return 'fold';
    const choice = Math.random();
    let actionObj = {action:'fold', amount:0};
    if(choice<0.5){
      const bet = Math.min(this.currentBet, this.botChips[botIndex]);
      this.botChips[botIndex]-=bet;
      this.addToPot(bet);
      actionObj = {action:'call', amount:bet};
    } else if(choice<0.7){
      const raise = Math.min(Math.floor(Math.random()*this.data.maxBet)+this.data.minBet, this.botChips[botIndex]);
      this.botChips[botIndex]-=raise;
      this.addToPot(raise);
      actionObj = {action:'raise', amount:raise};
    }
    console.log(`Bot ${botIndex+1}: ${actionObj.action} $${actionObj.amount}`);
    return actionObj;
  },

  startBotTurns: function(callback){
    let i=0;
    const interval = setInterval(()=>{
      if(i>=this.data.botCount){
        clearInterval(interval);
        callback();
        return;
      }
      this.botAction(i);
      i++;
    }, 1500);
  },

  // ----- BETTING ROUND LOGIC -----
  startBettingRound: function(){
    console.log("Starting betting round...");
    this.currentTurn = 0;
    this.playerActionInProgress = false;
  },

  nextTurn: function(){
    if(this.currentTurn < this.data.botCount){
      this.startBotTurns(()=>{ console.log("Bot turns completed"); });
    } else {
      console.log("Betting round complete");
      // Move to next phase (flop, turn, river)
    }
  }
});
