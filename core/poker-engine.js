// poker-engine.js
AFRAME.registerComponent('poker-engine', {
    schema: {
        startingBank: { type: 'number', default: 50000 },
        numPlayers: { type: 'number', default: 6 }
    },

    init: function () {
        const scene = this.el.sceneEl;

        this.players = [];
        this.pot = 0;
        this.communityCards = [];

        // Initialize players
        for (let i = 0; i < this.data.numPlayers; i++) {
            this.players.push({
                id: i,
                name: `Player ${i + 1}`,
                bank: this.data.startingBank,
                hand: [],
                isAI: i !== 0, // Player 0 is user
                seat: i
            });
        }

        // Create deck
        this.deck = this.createDeck();

        // Deal cards to players
        this.dealHands();

        // Event listener for betting
        scene.addEventListener('bet', (e) => {
            this.handleBet(e.detail.amount, e.detail.playerId || 0);
        });

        // Event listener for revealing community cards
        scene.addEventListener('reveal-community', () => {
            this.revealCommunityCards();
        });

        // Render player cards
        this.renderPlayerHands();
    },

    createDeck: function () {
        const suits = ['H', 'D', 'C', 'S'];
        const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        let deck = [];
        suits.forEach(suit => {
            values.forEach(value => {
                deck.push({suit: suit, value: value});
            });
        });
        // Shuffle deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    },

    dealHands: function () {
        this.players.forEach(player => {
            player.hand = [this.deck.pop(), this.deck.pop()];
        });
    },

    renderPlayerHands: function () {
        this.players.forEach(player => {
            player.hand.forEach((card, index) => {
                const cardEntity = document.createElement('a-box');
                cardEntity.setAttribute('width', 0.4);
                cardEntity.setAttribute('height', 0.6);
                cardEntity.setAttribute('depth', 0.05);
                cardEntity.setAttribute('color', '#FFF');
                cardEntity.setAttribute('position', {x: player.seat * 1.2 - 3, y: 1 + index * 0.01, z: -2});
                cardEntity.setAttribute('card-data', JSON.stringify(card));
                this.el.appendChild(cardEntity);
            });
        });
    },

    handleBet: function(amount, playerId = 0) {
        let player = this.players[playerId];
        if (player.bank >= amount) {
            player.bank -= amount;
            this.pot += amount;
            // Update pot text
            const potText = document.querySelector('#pot-text');
            if (potText) potText.setAttribute('value', "TOTAL POT: $" + this.pot);
            // Update player's wrist HUD
            const wristText = document.querySelector('#wrist-cash');
            if (wristText) wristText.setAttribute('value', "BANK: $" + player.bank);
        } else {
            console.warn(`${player.name} does not have enough chips.`);
        }
    },

    revealCommunityCards: function () {
        // Deal 5 cards (flop, turn, river)
        for (let i = 0; i < 5; i++) {
            const card = this.deck.pop();
            this.communityCards.push(card);
            const cardEntity = document.createElement('a-box');
            cardEntity.setAttribute('width', 0.5);
            cardEntity.setAttribute('height', 0.7);
            cardEntity.setAttribute('depth', 0.05);
            cardEntity.setAttribute('color', '#FFF');
            cardEntity.setAttribute('position', {x: i * 0.7 - 1.4, y: 1, z: 0});
            cardEntity.setAttribute('card-data', JSON.stringify(card));
            this.el.appendChild(cardEntity);
        }
    }
});
