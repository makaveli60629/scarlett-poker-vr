// File: core/table-game.js

AFRAME.registerComponent('table-game', {
    schema: {
        players: { type: 'int', default: 6 },
        startingChips: { type: 'int', default: 5000 }
    },

    init: function () {
        this.pot = 0;
        this.playerHands = [];
        this.aiHands = [];
        this.middleCards = [];
        this.setupPlayers();
        this.setupAI();
        this.setupInventoryHUD();
        this.setupTableInteraction();
        console.log("Table game initialized!");
    },

    setupPlayers: function() {
        for (let i = 0; i < this.data.players; i++) {
            let hand = this.createHand("player" + i);
            if (i === 0) {
                this.playerHands.push(hand);
            } else {
                this.aiHands.push(hand);
            }
        }
    },

    createHand: function(id) {
        let hand = {
            id: id,
            cards: [],
            chips: this.data.startingChips
        };
        return hand;
    },

    setupAI: function() {
        this.aiHands.forEach((ai, idx) => {
            ai.cards = this.dealCards();
        });
    },

    dealCards: function() {
        // Each hand gets 2 cards
        let cards = [];
        for (let i = 0; i < 2; i++) {
            cards.push(this.randomCard());
        }
        return cards;
    },

    randomCard: function() {
        const suits = ['hearts','diamonds','clubs','spades'];
        const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        let suit = suits[Math.floor(Math.random()*suits.length)];
        let rank = ranks[Math.floor(Math.random()*ranks.length)];
        return {suit: suit, rank: rank};
    },

    setupInventoryHUD: function() {
        const inventoryPanel = document.querySelector('#inventory-panel');
        const leftHandButton = document.querySelector('#leftHand-button');

        if(leftHandButton) {
            leftHandButton.addEventListener('click', () => {
                const isVisible = inventoryPanel.getAttribute('visible');
                inventoryPanel.setAttribute('visible', !isVisible);
            });
        }
    },

    setupTableInteraction: function() {
        const sceneEl = this.el;
        const self = this;

        // Betting box example
        const betBoxes = document.querySelectorAll('.bet-box');
        betBoxes.forEach(box => {
            box.addEventListener('click', function() {
                const amount = parseInt(this.getAttribute('data-bet') || "0");
                self.addBet(amount);
            });
        });
    },

    addBet: function(amount) {
        this.pot += amount;
        document.querySelector('#pot-text').setAttribute('value', "TOTAL POT: $" + this.pot);
        document.querySelector('#wrist-cash').setAttribute('value', "BANK: $" + (this.playerHands[0].chips - this.pot));
    },

    // Render middle table cards
    revealMiddleCards: function(count) {
        this.middleCards = [];
        for (let i=0; i<count; i++) {
            this.middleCards.push(this.randomCard());
        }
        // Update 3D cards in scene
        this.renderMiddleCards();
    },

    renderMiddleCards: function() {
        const tableEl = document.querySelector('#table');
        if(!tableEl) return;

        // Clear old cards
        const oldCards = tableEl.querySelectorAll('.middle-card');
        oldCards.forEach(c => c.parentNode.removeChild(c));

        // Render new cards
        this.middleCards.forEach((card, idx) => {
            const cardEl = document.createElement('a-box');
            cardEl.setAttribute('class','middle-card');
            cardEl.setAttribute('depth','0.01');
            cardEl.setAttribute('height','0.7');
            cardEl.setAttribute('width','0.5');
            cardEl.setAttribute('color','#ffffff');
            cardEl.setAttribute('position', {x: idx*0.6 - 1, y:1, z:0});
            tableEl.appendChild(cardEl);
        });
    },

    // Reveal player hand cards on hover
    showPlayerHand: function(playerIndex=0) {
        const hand = this.playerHands[playerIndex];
        hand.cards.forEach((card, idx) => {
            const cardEl = document.querySelector(`#player-card-${idx}`);
            if(cardEl) {
                cardEl.setAttribute('color','#fff');
                cardEl.setAttribute('value', `${card.rank} of ${card.suit}`);
            }
        });
    }
});
