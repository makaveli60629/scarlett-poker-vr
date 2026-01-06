// js/poker_simulation.js
// Skylark Poker VR — Update 9.0 (CRASH-SAFE)

export const PokerSimulation = {

    players: [],
    bots: [],
    deck: [],
    pot: 0,

    build({ players = [], bots = [] } = {}) {

        // 🛡️ HARD SAFETY GUARDS (NO MORE CRASHES)
        this.players = Array.isArray(players) ? players : [];
        this.bots    = Array.isArray(bots)    ? bots    : [];
        this.deck    = this.createDeck();
        this.pot     = 0;

        console.log("🃏 PokerSimulation initialized");
        console.log("Players:", this.players.length);
        console.log("Bots:", this.bots.length);

        if (this.players.length + this.bots.length === 0) {
            console.warn("⚠️ No players or bots detected — simulation idle.");
            return;
        }

        this.startHand();
    },

    createDeck() {
        const suits = ["♠", "♥", "♦", "♣"];
        const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
        const deck = [];

        for (const s of suits) {
            for (const r of ranks) {
                deck.push({ suit: s, rank: r });
            }
        }

        return this.shuffle(deck);
    },

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    startHand() {
        console.log("▶️ Starting poker hand");

        const participants = [...this.players, ...this.bots];

        participants.forEach(p => {
            p.hand = [
                this.deck.pop(),
                this.deck.pop()
            ];
        });

        console.log("🂡 Cards dealt");
    }
};
