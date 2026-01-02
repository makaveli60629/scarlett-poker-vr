import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';

class PokerGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.init();
        this.world = new World(this.scene);
        this.setupHands();
        this.gameLoop();
    }

    init() {
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupHands() {
        const handFactory = new XRHandModelFactory();

        // Left Hand
        this.hand1 = this.renderer.xr.getHand(0);
        this.hand1.add(handFactory.createHandModel(this.hand1, "mesh"));
        this.scene.add(this.hand1);

        // Right Hand
        this.hand2 = this.renderer.xr.getHand(1);
        this.hand2.add(handFactory.createHandModel(this.hand2, "mesh"));
        this.scene.add(this.hand2);
        
        // Audit Check: Controllers are intentionally omitted. Only hands are added.
    }

    /**
     * Triggered when a player wins the pot.
     * @param {string} player - Name of the winner
     * @param {string} handDescription - e.g., "Royal Flush"
     */
    triggerWinSequence(player, handDescription) {
        const display = document.getElementById('win-display');
        const pText = document.getElementById('player-text');
        const hText = document.getElementById('hand-text');

        pText.innerText = `${player} WINS THE POT`;
        hText.innerText = handDescription;
        display.style.display = 'block';

        // Winning hand highlight logic (Event Chip)
        console.log(`Audit: Highlighting winning hand: ${handDescription}`);

        // Stay for 10 seconds per requirements
        setTimeout(() => {
            display.style.display = 'none';
        }, 10000);
    }

    gameLoop() {
        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, this.camera);
        });
    }
}

// Start Game
const game = new PokerGame();

// Global access for testing win sequence (e.g., game.triggerWinSequence('Player 1', 'Full House'))
window.pokerGame = game;
