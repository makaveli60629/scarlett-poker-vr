AFRAME.registerSystem('table-game', {
    schema: {},

    init: function () {
        this.tableID = 'main-table';
        this.maxSeats = 6;
        this.players = [];
        this.bots = [];
        this.deck = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.round = 'idle';

        console.log('[TableGame] Initialized');
        this.setupDeck();
    },

    // -----------------------------
    // DECK LOGIC
    // -----------------------------
    setupDeck: function () {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        this.deck = [];

        suits.forEach(s => {
            values.forEach(v => {
                this.deck.push({ value: v, suit: s });
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

    drawCard: function () {
        return this.deck.pop();
    },

    // -----------------------------
    // PLAYER / BOT SETUP
    // -----------------------------
    seatPlayer: function (playerID) {
        if (this.players.length >= this.maxSeats) return false;
        this.players.push({
            id: playerID,
            hand: [],
            bet: 0,
            active: true
        });
        console.log(`[TableGame] Player seated: ${playerID}`);
        return true;
    },

    addBot: function (botID) {
        this.bots.push({
            id: botID,
            hand: [],
            bet: 0,
            active: true
        });
        console.log(`[TableGame] Bot added: ${botID}`);
    },

    // -----------------------------
    // ROUND FLOW
    // -----------------------------
    startHand: function () {
        this.round = 'preflop';
        this.pot = 0;
        this.currentBet = 0;
        this.communityCards = [];
        this.setupDeck();

        [...this.players, ...this.bots].forEach(p => {
            p.hand = [this.drawCard(), this.drawCard()];
            p.bet = 0;
        });

        console.log('[TableGame] New hand started');
    },

    dealFlop: function () {
        this.round = 'flop';
        this.communityCards.push(this.drawCard(), this.drawCard(), this.drawCard());
        console.log('[TableGame] Flop dealt', this.communityCards);
    },

    dealTurn: function () {
        this.round = 'turn';
        this.communityCards.push(this.drawCard());
        console.log('[TableGame] Turn dealt', this.communityCards);
    },

    dealRiver: function () {
        this.round = 'river';
        this.communityCards.push(this.drawCard());
        console.log('[TableGame] River dealt', this.communityCards);
    },

    // -----------------------------
    // BETTING
    // -----------------------------
    placeBet: function (playerID, amount) {
        const economy = this.el.sceneEl.systems['economy'];
        if (!economy.subtractChips) return;

        economy.placeBet(this.tableID, playerID, amount);
        this.pot += amount;
        this.currentBet = Math.max(this.currentBet, amount);

        console.log(`[TableGame] ${playerID} bet $${amount}`);
    },

    botAction: function (bot) {
        const decision = Math.random();
        if (decision < 0.7) {
            const bet = Math.floor(Math.random() * 300) + 100;
            this.placeBet(bot.id, bet);
        } else {
            bot.active = false;
            console.log(`[TableGame] Bot ${bot.id} folded`);
        }
    },

    // -----------------------------
    // END HAND
    // -----------------------------
    endHand: function () {
        const economy = this.el.sceneEl.systems['economy'];
        const winner = this.players[Math.floor(Math.random() * this.players.length)];
        economy.distributePot(this.tableID, [winner.id]);
        console.log(`[TableGame] Hand ended, winner: ${winner.id}`);
        this.round = 'idle';
    },

    // -----------------------------
    // CARD VISUAL HELPERS
    // -----------------------------
    getPlayerHand: function (playerID) {
        const p = this.players.find(p => p.id === playerID);
        return p ? p.hand : [];
    },

    getCommunityCards: function () {
        return this.communityCards;
    }
});
