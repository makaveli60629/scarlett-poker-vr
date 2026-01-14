import * as THREE from 'three';

export const Controls = {
    player: null,
    camera: null,
    renderer: null,
    rightController: null,
    reticle: null,
    canTeleport: false,
    target: new THREE.Vector3(),
    moveSpeed: 2.8,
    snapAngle: Math.PI / 4,
    _snapTimer: 0,

    init({ renderer, camera, player, scene }) {
        this.renderer = renderer;
        this.camera = camera;
        this.player = player;

        // Teleport Circle
        this.reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 32),
            new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide })
        );
        this.reticle.rotation.x = -Math.PI / 2;
        this.reticle.visible = false;
        scene.add(this.reticle);

        // Controller Setup
        for (let i = 0; i < 2; i++) {
            const ct = renderer.xr.getController(i);
            ct.addEventListener('connected', (e) => {
                if (e.data.handedness === 'right') {
                    this.rightController = ct;
                    const line = new THREE.Line(
                        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-10)]),
                        new THREE.LineBasicMaterial({ color: 0x00ffff })
                    );
                    ct.add(line);
                }
            });
            player.add(ct);
        }
    },

    update(dt) {
        const session = this.renderer.xr.getSession();
        if (!session) return;
        this._snapTimer = Math.max(0, this._snapTimer - dt);

        for (const source of session.inputSources) {
            if (!source.gamepad) continue;
            const axes = source.gamepad.axes;
            const buttons = source.gamepad.buttons;

            // --- LEFT STICK: PRESERVED (WORKING) ---
            if (source.handedness === 'left') {
                const lx = axes[2] || axes[0] || 0;
                const ly = axes[3] || axes[1] || 0;
                if (Math.abs(lx) > 0.15 || Math.abs(ly) > 0.15) {
                    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                    fwd.y = 0; fwd.normalize();
                    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
                    side.y = 0; side.normalize();
                    this.player.position.addScaledVector(fwd, ly * this.moveSpeed * dt);
                    this.player.position.addScaledVector(side, -lx * this.moveSpeed * dt);
                }
            }

            // --- RIGHT STICK: FIXED & TELEPORT ---
            if (source.handedness === 'right') {
                const rx = axes[2] || axes[0] || 0;
                const ry = axes[3] || axes[1] || 0;

                // Move Forward/Back (FIXED: -ry corrected inversion)
                if (Math.abs(ry) > 0.1) {
                    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                    fwd.y = 0; fwd.normalize();
                    this.player.position.addScaledVector(fwd, -ry * this.moveSpeed * dt);
                }

                // Snap Turn (FIXED: 45° Angle logic)
                if (Math.abs(rx) > 0.7 && this._snapTimer <= 0) {
                    this.player.rotation.y += -Math.sign(rx) * this.snapAngle;
                    this._snapTimer = 0.35;
                }

                // Teleport Trigger (Jump to the Circle)
                if (buttons[0].pressed && this.canTeleport) {
                    this.player.position.copy(this.target);
                    this.canTeleport = false; // Prevent "sliding"
                }
            }
        }
        this._updateLaser();
    },

    _updateLaser() {
        if (!this.rightController) return;
        const wp = new THREE.Vector3();
        const wd = new THREE.Vector3(0, 0, -1);
        this.rightController.getWorldPosition(wp);
        wd.applyQuaternion(this.rightController.getWorldQuaternion(new THREE.Quaternion()));

        if (wd.y < -0.1) {
            const t = -wp.y / wd.y;
            this.target.set(wp.x + wd.x * t, 0, wp.z + wd.z * t);
            this.reticle.position.set(this.target.x, 0.05, this.target.z);
            this.reticle.visible = true;
            this.canTeleport = true;
        } else {
            this.reticle.visible = false;
            this.canTeleport = false;
        }
    }
};
