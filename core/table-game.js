// core/table-game.js

AFRAME.registerComponent('table-game', {
  schema: {},

  init: function () {
    // References
    this.playerSeat = document.querySelector('#playerSeat');
    this.ais = [
      document.querySelector('#ai1'),
      document.querySelector('#ai2'),
      document.querySelector('#ai3'),
      document.querySelector('#ai4'),
      document.querySelector('#ai5')
    ];
    this.deckEntity = document.querySelector('#deck');
    this.potEntity = document.querySelector('#pot');

    this.playerHand = [];
    this.aiHands = [[], [], [], [], []];
    this.communityCards = [];

    // Initialize Table
    this.initDeck();
    this.dealHands();
    this.dealCommunityCards();

    // Add interactivity
    this.setupCardHover();
    this.updatePotDisplay();
  },

  initDeck: function () {
    this.deck = [];
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        this.deck.push({suit, rank});
      });
    });
    this.shuffleDeck();
  },

  shuffleDeck: function () {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  },

  dealHands: function () {
    // Deal 2 cards to player
    this.playerHand = [this.deck.pop(), this.deck.pop()];
    this.spawnCards(this.playerHand, this.playerSeat, true);

    // Deal 2 cards to each AI
    for (let i = 0; i < this.ais.length; i++) {
      this.aiHands[i] = [this.deck.pop(), this.deck.pop()];
      this.spawnCards(this.aiHands[i], this.ais[i], false);
    }
  },

  dealCommunityCards: function () {
    // 5 community cards in the center (flop + turn + river)
    this.communityCards = [
      this.deck.pop(), this.deck.pop(), this.deck.pop(),
      this.deck.pop(), this.deck.pop()
    ];
    this.spawnCommunityCards(this.communityCards);
  },

  spawnCards: function (cards, seatEntity, faceUp) {
    cards.forEach((card, idx) => {
      const cardEl = document.createElement('a-plane');
      cardEl.setAttribute('width', 0.2);
      cardEl.setAttribute('height', 0.3);
      cardEl.setAttribute('color', faceUp ? '#fff' : '#990000');
      cardEl.setAttribute('position', `${idx * 0.25 - 0.25} 0.05 0`);
      cardEl.setAttribute('material', 'shader: flat');

      // Optional: texture image of card front
      if (faceUp) {
        cardEl.setAttribute('src', `assets/cards/${card.rank}_of_${card.suit}.png`);
      }

      seatEntity.appendChild(cardEl);
    });
  },

  spawnCommunityCards: function (cards) {
    cards.forEach((card, idx) => {
      const cardEl = document.createElement('a-plane');
      cardEl.setAttribute('width', 0.25);
      cardEl.setAttribute('height', 0.35);
      cardEl.setAttribute('position', `${idx * 0.3 - 0.6} 0.05 0`);
      cardEl.setAttribute('material', 'shader: flat');
      cardEl.setAttribute('src', `assets/cards/${card.rank}_of_${card.suit}.png`);
      this.deckEntity.appendChild(cardEl);
    });
  },

  setupCardHover: function () {
    const camera = document.querySelector('#playerCamera');
    this.playerSeat.querySelectorAll('a-plane').forEach(card => {
      card.setAttribute('class', 'interactable');
      card.addEventListener('mouseenter', () => {
        card.setAttribute('position', `${card.getAttribute('position').x} 0.3 0`);
      });
      card.addEventListener('mouseleave', () => {
        card.setAttribute('position', `${card.getAttribute('position').x} 0.05 0`);
      });
    });
  },

  updatePotDisplay: function () {
    // Clear old pot
    while (this.potEntity.firstChild) {
      this.potEntity.removeChild(this.potEntity.firstChild);
    }

    // Display chips in pot
    const totalChips = 1000; // example, link with economy.js
    for (let i = 0; i < Math.min(10, totalChips / 100); i++) {
      const chipEl = document.createElement('a-cylinder');
      chipEl.setAttribute('radius', 0.05);
      chipEl.setAttribute('height', 0.02);
      chipEl.setAttribute('color', '#FFD700');
      chipEl.setAttribute('position', `0 ${i * 0.02} 0`);
      this.potEntity.appendChild(chipEl);
    }
  }
});

// Attach component to scene
document.querySelector('a-scene').setAttribute('table-game', '');
