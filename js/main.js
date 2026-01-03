import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import CONFIG from './config.js';

class PokerGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.playerGroup = new THREE.Group();
        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        this.playerGroup.add(this.camera);
        this.scene.add(this.playerGroup);
        
        this.setupHands();
        this.initMegaParticles();
        this.renderer.setAnimationLoop(() => this.render());
    }

    setupHands() {
        const handFactory = new XRHandModelFactory();
        for (let i = 0; i < 2; i++) {
            const hand = this.renderer.xr.getHand(i);
            hand.add(handFactory.createHandModel(hand, 'mesh'));
            this.playerGroup.add(hand);
        }
    }

    initMegaParticles() {
        const geo = new THREE.BufferGeometry();
        const pos = [];
        for (let i = 0; i < 15000; i++) {
            pos.push((Math.random() - 0.5) * 40, Math.random() * 20, (Math.random() - 0.5) * 40);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.03 });
        this.scene.add(new THREE.Points(geo, mat));
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
new PokerGame();
