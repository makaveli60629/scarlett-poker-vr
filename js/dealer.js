import * as THREE from 'three';

export const Dealer = {
    deck: [],
    suits: ['Hearts', 'Diamonds', 'Clubs', 'Spades'],
    values: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],

    init(scene) {
        this.generateDeck();
        this.shuffle();
    },

    generateDeck() {
        this.deck = [];
        for (let s of this.suits) {
            for (let v of this.values) {
                this.deck.push({ suit: s, value: v });
            }
        }
    },

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
};
