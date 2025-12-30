// table-game.js
AFRAME.registerComponent('hoverable', {
  init: function () {
    this.el.addEventListener('mouseenter', () => {
      this.el.setAttribute('scale', '1.2 1.2 1.2');
    });
    this.el.addEventListener('mouseleave', () => {
      this.el.setAttribute('scale', '1 1 1');
    });
  }
});

// --- Table Game Logic ---
const game = {
  players: [],
  bots: [],
  deck: [],
  communityCards: [],
  pot: 0,
  currentPlayerIndex: 0,
  tableEntity: document.getElementById('pokerTable'),

  init: function () {
    // Create deck
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    this.deck = [];
    suits.forEach(suit => {
      values.forEach(value => {
        this.deck.push({ suit, value });
      });
    });
    this.shuffleDeck();
    this.initPlayers();
    this.dealHands();
  },

  shuffleDeck: function () {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  },

  initPlayers: function () {
    // 6 players (index 0 is human, 1-5 are bots)
    this.players = [{ name: 'You', hand: [], chips: 1000 }];
    for (let i = 1; i < 6; i++) {
      this.players.push({ name: 'Bot' + i, hand: [], chips: 1000 });
      this.bots.push(this.players[i]);
    }
  },

  dealHands: function () {
    this.players.forEach(player => {
      player.hand = [this.deck.pop(), this.deck.pop()];
    });
    this.updatePlayerCards();
    this.dealCommunityCards();
  },

  updatePlayerCards: function () {
    // Show face-down for bots, face-up for human
    this.players.forEach((player, index) => {
      const cardEls = [
        document.getElementById('flop1'),
        document.getElementById('flop2'),
        document.getElementById('flop3'),
        document.getElementById('turn'),
        document.getElementById('river')
      ];
      if (index === 0) {
        // Human: show first card
        player.hand.forEach((card, i) => {
          console.log(`Player card ${i + 1}: ${card.value} of ${card.suit}`);
        });
      }
      // Bots: cards remain face-down
    });
  },

  dealCommunityCards: function () {
    // Flop
    this.communityCards = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
    document.getElementById('flop1').setAttribute('color', '#ffffff');
    document.getElementById('flop2').setAttribute('color', '#ffffff');
    document.getElementById('flop3').setAttribute('color', '#ffffff');
    // Turn
    this.communityCards.push(this.deck.pop());
    document.getElementById('turn').setAttribute('color', '#ffffff');
    // River
    this.communityCards.push(this.deck.pop());
    document.getElementById('river').setAttribute('color', '#ffffff');
  },

  bet: function (playerIndex, amount) {
    const player = this.players[playerIndex];
    if (player.chips >= amount) {
      player.chips -= amount;
      this.pot += amount;
      console.log(`${player.name} bets ${amount} chips. Pot: ${this.pot}`);
    } else {
      console.log(`${player.name} does not have enough chips`);
    }
  },

  nextTurn: function () {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    console.log(`It's now ${this.players[this.currentPlayerIndex].name}'s turn`);
  }
};

// Initialize game when scene is loaded
document.querySelector('a-scene').addEventListener('loaded', () => {
  game.init();
});
