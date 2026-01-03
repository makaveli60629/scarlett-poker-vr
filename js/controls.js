import * as THREE from 'three';

export const Controls = {

    renderer: null,
    scene: null,
    player: null,

    clock: new THREE.Clock(),

    // Movement state
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,

    speed: 2.0,

    init(renderer, scene, playerGroup) {
        this.renderer = renderer;
        this.scene = scene;
        this.player = playerGroup;

        // Keyboard fallback (desktop + safety)
        window.addEventListener('keydown', (e) => this.onKey(e, true));
        window.addEventListener('keyup', (e) => this.onKey(e, false));

        // XR session detection (SAFE)
        renderer.xr.addEventListener('sessionstart', () => {
            console.log('XR session started');
        });

        renderer.xr.addEventListener('sessionend', () => {
            console.log('XR session ended');
        });

        console.log('Controls system initialized safely');
    },

    onKey(event, isDown) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = isDown;
                break;

            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = isDown;
                break;

            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = isDown;
                break;

            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = isDown;
                break;
        }
    },

    update(renderer, camera, playerGroup) {
        const delta = this.clock.getDelta();

        // Direction vectors
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(camera.up, forward).normalize();

        if (this.moveForward) {
            playerGroup.position.addScaledVector(forward, this.speed * delta);
        }

        if (this.moveBackward) {
            playerGroup.position.addScaledVector(forward, -this.speed * delta);
        }

        if (this.moveLeft) {
            playerGroup.position.addScaledVector(right, this.speed * delta);
        }

        if (this.moveRight) {
            playerGroup.position.addScaledVector(right, -this.speed * delta);
        }
    }
};
