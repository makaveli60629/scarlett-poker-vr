// Scarlett VR Poker Table Game Logic
const game = {
  players: [
    { id: 0, chips: 1000, hand: [] },
    { id: 1, chips: 1000, hand: [] },
    { id: 2, chips: 1000, hand: [] },
    { id: 3, chips: 1000, hand: [] },
    { id: 4, chips: 1000, hand: [] },
    { id: 5, chips: 1000, hand: [] }
  ],
  pot: 0,
  currentTurn: 0,
  deck: [],
};

// Initialize deck
function initDeck() {
  const suits = ['H', 'D', 'C', 'S'];
  const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  game.deck = [];
  suits.forEach(suit => {
    values.forEach(val => game.deck.push({suit, val}));
  });
  shuffleDeck();
}

function shuffleDeck() {
  for(let i = game.deck.length -1; i >0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [game.deck[i], game.deck[j]] = [game.deck[j], game.deck[i]];
  }
}

// Deal two cards to each player
function dealHands() {
  game.players.forEach(player => {
    player.hand = [game.deck.pop(), game.deck.pop()];
    // Add card visuals
    displayPlayerHand(player);
  });
}

// Display player hand cards in VR
function displayPlayerHand(player) {
  const container = document.getElementById('cardsContainer');
  const offset = player.id * 0.5 - 1.5;
  player.hand.forEach((card, idx) => {
    const cardEntity = document.createElement('a-box');
    cardEntity.setAttribute('color', '#fff');
    cardEntity.setAttribute('depth', '0.02');
    cardEntity.setAttribute('height', '0.1');
    cardEntity.setAttribute('width', '0.07');
    cardEntity.setAttribute('position', `${offset + idx*0.08} 0.2 -3`);
    container.appendChild(cardEntity);
  });
}

// Betting logic
function bet(playerId, amount) {
  const player = game.players[playerId];
  if(player.chips >= amount){
    player.chips -= amount;
    game.pot += amount;
    updateHUD();
  }
}

// Next turn
function nextTurn() {
  game.currentTurn = (game.currentTurn + 1) % game.players.length;
}

// Update HUD
function updateHUD() {
  const chipText = document.getElementById('chipCount');
  const potText = document.getElementById('potAmount');
  chipText.setAttribute('value', `Chips: ${game.players[0].chips}`);
  potText.setAttribute('value', `Pot: ${game.pot}`);
}

// Start game
document.addEventListener('DOMContentLoaded', () => {
  initDeck();
  dealHands();
  updateHUD();
});
