// table-game.js
AFRAME.registerComponent('table-game', {
    schema: {
        players: { type: 'int', default: 6 },
        humanIndex: { type: 'int', default: 0 }
    },

    init: function () {
        this.pot = 0;
        this.deck = this.createDeck();
        this.players = [];
        this.tableCards = [];
        this.dealCards();
        this.createPlayers();
        this.renderTable();
        this.bindEvents();
    },

    createDeck: function () {
        const suits = ['H', 'D', 'C', 'S'];
        const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        let deck = [];
        suits.forEach(suit => {
            values.forEach(value => deck.push({suit, value}));
        });
        return deck.sort(() => Math.random() - 0.5); // shuffle
    },

    dealCards: function () {
        this.playersHands = [];
        for (let i=0; i<this.data.players; i++) {
            this.playersHands.push([this.deck.pop(), this.deck.pop()]);
        }
        this.tableCards = [];
    },

    createPlayers: function () {
        const table = document.querySelector('a-scene');
        for (let i = 0; i < this.data.players; i++) {
            let seat = document.createElement('a-entity');
            seat.setAttribute('id', 'player-'+i);
            seat.setAttribute('position', this.getSeatPosition(i));
            seat.setAttribute('rotation', '0 '+(i*60)+' 0');

            // Chips
            let chips = document.createElement('a-cylinder');
            chips.setAttribute('color', i===this.data.humanIndex ? 'gold':'silver');
            chips.setAttribute('height', 0.2);
            chips.setAttribute('radius', 0.5);
            chips.setAttribute('position', '0 0.1 0');
            seat.appendChild(chips);

            table.appendChild(seat);
            this.players.push(seat);
        }
    },

    getSeatPosition: function (index) {
        const radius = 4;
        const angle = (index/this.data.players) * 2 * Math.PI;
        return {
            x: radius*Math.sin(angle),
            y: 0,
            z: radius*Math.cos(angle)
        };
    },

    renderTable: function () {
        const tableEntity = document.querySelector('a-entity[table-game]');
        // Flop, turn, river cards
        const cardY = 1;
        const cardZStart = 0;
        for (let i=0;i<5;i++) {
            let card = document.createElement('a-box');
            card.setAttribute('width', 0.3);
            card.setAttribute('height', 0.02);
            card.setAttribute('depth', 0.4);
            card.setAttribute('color', '#ffffff');
            card.setAttribute('position', `${-0.6+i*0.3} ${cardY} ${cardZStart}`);
            card.setAttribute('class', 'table-card');
            tableEntity.appendChild(card);
            this.tableCards.push(card);
        }

        // Deal animation
        this.dealAnimation();
    },

    dealAnimation: function () {
        const duration = 600;
        for (let i=0;i<this.data.players;i++) {
            let hand = this.playersHands[i];
            hand.forEach((card, idx) => {
                let cardEl = document.createElement('a-box');
                cardEl.setAttribute('width', 0.3);
                cardEl.setAttribute('height', 0.02);
                cardEl.setAttribute('depth', 0.4);
                cardEl.setAttribute('color', i===this.data.humanIndex ? 'gold':'silver');
                cardEl.setAttribute('position', '0 2 -5'); // start position
                cardEl.setAttribute('animation__move', `property: position; to: ${this.getSeatPosition(i).x} 1.1 ${this.getSeatPosition(i).z}; dur: ${duration}; easing: easeOutQuad; delay: ${idx*150}`);
                cardEl.setAttribute('hoverable', 'true');
                document.querySelector('a-scene').appendChild(cardEl);
            });
        }
    },

    bindEvents: function () {
        const scene = document.querySelector('a-scene');
        scene.addEventListener('bet', (e) => {
            this.pot += e.detail.amount;
            const potText = document.querySelector('#pot-text');
            if (potText) potText.setAttribute('value', `TOTAL POT: $${this.pot}`);
        });
    }
});
