import * as THREE from 'three';

export const Dealer = {
    deck: [],
    initDeck() {
        const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        for (let s of suits) {
            for (let v of values) {
                this.deck.push({ suit: s, value: v });
            }
        }
        this.shuffle();
    },
    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    },
    dealFlop(scene) {
        for (let i = 0; i < 3; i++) {
            const cardData = this.deck.pop();
            const card = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.005, 0.15), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            card.position.set(-0.2 + (i * 0.2), 0.86, 0);
            scene.add(card);
        }
    }
};
