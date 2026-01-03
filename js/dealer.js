import * as THREE from 'three';

export const Dealer = {
    deck: [],
    suits: ['Hearts', 'Diamonds', 'Clubs', 'Spades'],
    values: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    activeCards: [],

    initDeck() {
        this.deck = [];
        for (let s of this.suits) {
            for (let v of this.values) {
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

    // Physical Card Creation (The "Basic" Gray Cards for now)
    createCardMesh(suit, val) {
        const cardGeo = new THREE.BoxGeometry(0.1, 0.005, 0.15);
        const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const card = new THREE.Mesh(cardGeo, cardMat);
        card.userData = { suit, val };
        return card;
    },

    dealFlop(scene) {
        for (let i = 0; i < 3; i++) {
            const cardData = this.deck.pop();
            const cardMesh = this.createCardMesh(cardData.suit, cardData.value);
            // Spread them across the center of the table
            cardMesh.position.set(-0.2 + (i * 0.2), 0.86, 0); 
            scene.add(cardMesh);
            this.activeCards.push(cardMesh);
        }
    }
};

Dealer.initDeck();
