import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { World } from './world.js';
import { Logic } from './logic.js';

const Core = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: true, xrCompatible: true }),
    playerGroup: new THREE.Group(),
    menuGroup: new THREE.Group(),
    hands: [],
    isMenuOpen: false,

    async init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        this.playerGroup.position.set(0, 0, 0); 
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);

        this.setupHands();
        this.createMenu();
        World.build(this.scene);
        this.renderer.setAnimationLoop(() => this.update());
    },

    setupHands() {
        const factory = new XRHandModelFactory();
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 }); // Natural Complexion

        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getHand(i);
            const model = factory.createHandModel(controller, 'mesh');
            
            // Apply complexion to hand mesh when it loads
            model.addEventListener('connected', (event) => {
                event.target.traverse((child) => {
                    if (child.isMesh) child.material = skinMat;
                });
            });

            controller.add(model);
            this.playerGroup.add(controller);
            
            // Attach Watch to Left Hand (index 0)
            if (i === 0) this.attachWatch(controller);
        }
    },

    attachWatch(hand) {
        const watchGeo = new THREE.BoxGeometry(0.08, 0.02, 0.06);
        const watchMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const watch = new THREE.Mesh(watchGeo, watchMat);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256; canvas.height = 128;
        ctx.fillStyle = '#111'; ctx.fillRect(0,0,256,128);
        ctx.fillStyle = '#00f2ff'; ctx.font = 'bold 40px Arial';
        ctx.fillText(`$${Logic.stats.chips}`, 20, 80);

        const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(0.07, 0.05),
            new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
        );
        screen.position.y = 0.011;
        screen.rotation.x = -Math.PI/2;
        
        watch.add(screen);
        watch.position.set(0, 0.03, 0.05); // Positioned on wrist
        hand.add(watch);
    },

    createMenu() {
        // Floating Menu Screen
        const menuGeo = new THREE.PlaneGeometry(0.6, 0.4);
        const menuMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 });
        const menuPlane = new THREE.Mesh(menuGeo, menuMat);
        
        const border = new THREE.LineSegments(
            new THREE.EdgesGeometry(menuGeo),
            new THREE.LineBasicMaterial({ color: 0x00f2ff })
        );
        
        this.menuGroup.add(menuPlane, border);
        this.menuGroup.visible = false;
        this.scene.add(this.menuGroup);
    },

    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.menuGroup.visible = this.isMenuOpen;
        if (this.isMenuOpen) {
            // Position menu in front of player
            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            this.menuGroup.position.copy(this.playerGroup.position).addScaledVector(dir, 1);
            this.menuGroup.lookAt(this.playerGroup.position);
        }
    },

    update() {
        const session = this.renderer.xr.getSession();
        if (session) {
            for (const source of session.inputSources) {
                if (source.gamepad) {
                    // X Button (index 4 or 3 depending on system) to toggle Menu
                    if (source.handedness === 'left' && source.gamepad.buttons[4]?.pressed) {
                        this.toggleMenu();
                    }
                    // Right Stick Teleport/Smooth movement logic...
                }
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};

Core.init();
