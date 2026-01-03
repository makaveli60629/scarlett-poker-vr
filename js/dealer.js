export const Dealer = {
    deck: [],

    init(scene) {
        const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
        const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

        this.deck.length = 0;

        for (const s of suits) {
            for (const v of values) {
                this.deck.push({ suit: s, value: v });
            }
        }

        this.shuffle();
        console.log("Deck ready:", this.deck.length, "cards");
    },

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
};
