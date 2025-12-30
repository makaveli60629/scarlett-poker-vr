import { getPlayerProfile, updatePlayerData } from './firebase-config.js';

// -------------------------
// Poker Table Constants
// -------------------------
const TABLE_SEATS = 6;

// Card suits and ranks
const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

// -------------------------
// Table State
// -------------------------
export class PokerTable {
    constructor(uid) {
        this.uid = uid;
        this.players = Array(TABLE_SEATS).fill(null);
        this.pot = 0;
        this.deck = this.createDeck();
        this.communityCards = [];
        this.currentBets = Array(TABLE_SEATS).fill(0);
        this.turnIndex = 0;
        this.gameState = 'waiting'; // 'waiting', 'pre-flop', 'flop', 'turn', 'river', 'showdown'
    }

    // Create new deck
    createDeck() {
        const deck = [];
        for (let suit of SUITS) {
            for (let rank of RANKS) {
                deck.push({rank, suit});
            }
        }
        return this.shuffle(deck);
    }

    // Shuffle deck
    shuffle(deck) {
        return deck.sort(() => Math.random() - 0.5);
    }

    // Add player
    addPlayer(player) {
        for (let i = 0; i < TABLE_SEATS; i++) {
            if (!this.players[i]) {
                this.players[i] = player;
                return i;
            }
        }
        return -1; // table full
    }

    // Deal hole cards
    dealHoleCards() {
        this.players.forEach(player => {
            if (player) {
                player.hand = [this.deck.pop(), this.deck.pop()];
            }
        });
    }

    // Deal community cards
    dealFlop() {
        this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
    }

    dealTurn() {
        this.communityCards.push(this.deck.pop());
    }

    dealRiver() {
        this.communityCards.push(this.deck.pop());
    }

    // Bet function
    async bet(playerIndex, amount) {
        const player = this.players[playerIndex];
        if (!player) return false;
        if (player.chips < amount) return false;

        player.chips -= amount;
        this.currentBets[playerIndex] += amount;
        this.pot += amount;

        // Update Firebase
        if (player.isUser) {
            await updatePlayerData(this.uid, { chips: player.chips });
        }

        console.log(`${player.name} bets ${amount}. Pot: ${this.pot}`);
        return true;
    }

    // Get winner (simplified placeholder, expand later)
    determineWinner() {
        const activePlayers = this.players.filter(p => p);
        const winner = activePlayers[Math.floor(Math.random() * activePlayers.length)];
        console.log(`Winner is ${winner.name}`);
        if (winner.isUser) updatePlayerData(this.uid, { chips: winner.chips + this.pot });
        return winner;
    }
}

// -------------------------
// Player Object
// -------------------------
export class Player {
    constructor(name, chips, isUser = false) {
        this.name = name;
        this.chips = chips;
        this.hand = [];
        this.isUser = isUser;
    }
}

// -------------------------
// VR Interaction Hooks
// -------------------------
export function attachVRInteractions(sceneEl, table) {
    // Grab cards to look at them
    const cards = sceneEl.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.object3D.position.y += 0.2; // hover effect
        });
        card.addEventListener('mouseleave', () => {
            card.object3D.position.y -= 0.2;
        });
    });

    // Click to bet
    const betButtons = sceneEl.querySelectorAll('.bet-button');
    betButtons.forEach((btn, i) => {
        btn.addEventListener('click', async () => {
            const amount = parseInt(btn.getAttribute('data-amount'));
            await table.bet(0, amount); // playerIndex 0 = VR user
            updatePotDisplay(sceneEl, table.pot);
        });
    });
}

// -------------------------
// Display Pot
// -------------------------
export function updatePotDisplay(sceneEl, pot) {
    const potText = sceneEl.querySelector('#pot-text');
    if (potText) potText.setAttribute('value', `TOTAL POT: $${pot}`);
                    }
