// table-game.js
// Handles VR poker table gameplay

import { addChips, deductChips, unlockAchievement } from './economy.js';

AFRAME.registerComponent('poker-engine', {
  schema: {},

  init: function () {
    this.pot = 0;
    this.players = [];
    this.communityCards = [];
    this.currentBet = 0;

    // Example: setup 6 seats
    for (let i = 0; i < 6; i++) {
      this.players.push({
        id: `player${i + 1}`,
        hand: [],
        chips: i === 0 ? 50000 : 5000, // Player 1 = main player
        folded: false
      });
    }

    // Event listeners for bets
    this.el.addEventListener('bet', (e) => {
      const amount = e.detail.amount;
      if (deductChips(amount)) {
        this.pot += amount;
        document.querySelector('#pot-text').setAttribute('value', `TOTAL POT: $${this.pot}`);
      }
    });

    // Initial dealing
    this.dealHands();
  },

  dealHands: function () {
    // Simple card representation
    const suits = ['♠','♥','♦','♣'];
    const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let deck = [];
    suits.forEach(s => ranks.forEach(r => deck.push({suit:s, rank:r})));
    deck = this.shuffle(deck);

    // Deal 2 cards per player
    this.players.forEach(player => {
      player.hand = [deck.pop(), deck.pop()];
      if (player.id === 'player1') {
        this.renderPlayerCards(player.hand);
      }
    });

    // 5 community cards
    this.communityCards = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    this.renderCommunityCards();
  },

  shuffle: function(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  },

  renderPlayerCards: function(hand) {
    const handContainer = document.getElementById('player-hand');
    handContainer.innerHTML = '';
    hand.forEach((card, i) => {
      const cardEntity = document.createElement('a-plane');
      cardEntity.setAttribute('position', `${i * 0.6 - 0.3} 0 0`);
      cardEntity.setAttribute('width', '0.5');
      cardEntity.setAttribute('height', '0.7');
      cardEntity.setAttribute('color', '#fff');
      cardEntity.setAttribute('material', 'shader: standard; side: double');
      cardEntity.setAttribute('card', `${card.rank}${card.suit}`); // for hover
      handContainer.appendChild(cardEntity);
    });
  },

  renderCommunityCards: function() {
    const container = document.getElementById('community-cards');
    container.innerHTML = '';
    this.communityCards.forEach((card, i) => {
      const cardEntity = document.createElement('a-plane');
      cardEntity.setAttribute('position', `${i * 0.6 - 1.2} 0 0`);
      cardEntity.setAttribute('width', '0.5');
      cardEntity.setAttribute('height', '0.7');
      cardEntity.setAttribute('color', '#fff');
      cardEntity.setAttribute('material', 'shader: standard; side: double');
      cardEntity.setAttribute('card', `${card.rank}${card.suit}`);
      container.appendChild(cardEntity);
    });
  }
});

// Optional card hover effect
AFRAME.registerComponent('card', {
  schema: { type: 'string' },
  init: function () {
    const el = this.el;
    el.addEventListener('mouseenter', () => {
      el.setAttribute('text', `value: ${this.data}; color: black; align: center`);
    });
    el.addEventListener('mouseleave', () => {
      el.removeAttribute('text');
    });
  }
});
