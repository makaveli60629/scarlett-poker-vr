<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Poker VR 1.3 - Master Build</title>
    <style>
        body { margin: 0; overflow: hidden; background: #000; font-family: sans-serif; }
        #win-ui {
            position: fixed; top: 15%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9); color: gold; padding: 30px;
            border: 3px solid #00f2ff; border-radius: 20px; display: none;
            text-align: center; z-index: 1000;
        }
    </style>
</head>
<body>
    <div id="win-ui"><h1 id="winner-name"></h1><p id="winner-hand"></p></div>

    <script type="importmap">
        { "imports": { 
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/" 
        } }
    </script>

    <script type="module">
        import * as THREE from 'three';
        import { VRButton } from 'three/addons/webxr/VRButton.js';
        import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

        // --- 1. THE PHYSICS ENGINE (Capital P) ---
        class Physics {
            constructor() { this.colliders = []; }
            add(mesh) {
                mesh.updateMatrixWorld();
                const box = new THREE.Box3().setFromObject(mesh);
                this.colliders.push(box);
            }
            check(pos) {
                const playerSphere = new THREE.Sphere(pos, 0.5);
                for(let wall of this.colliders) {
                    if(wall.intersectsSphere(playerSphere)) return true;
                }
                return false;
            }
        }
        const P = new Physics();

        // --- 2. ENGINE SETUP ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050505);
        
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        document.body.appendChild(renderer.domElement);
        document.body.appendChild(VRButton.createButton(renderer));

        const playerRig = new THREE.Group();
        playerRig.add(camera);
        scene.add(playerRig);
        playerRig.position.set(0, 0, 5); // Start in Lobby center

        // --- 3. LIGHTING ---
        const amb = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(amb);

        // --- 4. THE 4 ROOMS (4m Ceilings & Brick) ---
        const brickMat = new THREE.MeshStandardMaterial({ color: 0x8b2222 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });

        function buildRoom(name, x, z, size, color) {
            const group = new THREE.Group();
            
            // Floor & Ceiling
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: 0x111111}));
            floor.rotation.x = -Math.PI/2;
            const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: 0x111111}));
            ceil.position.y = 4; // 4m Logic
            ceil.rotation.x = Math.PI/2;
            group.add(floor, ceil);

            // Back Brick Wall
            const wall = new THREE.Mesh(new THREE.BoxGeometry(size, 4, 0.5), brickMat);
            wall.position.set(0, 2, -size/2);
            group.add(wall);
            P.add(wall); // SOLID PHYSICS

            // Corner Pillars
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4), goldMat);
            p.position.set(-size/2+0.5, 2, -size/2+0.5);
            group.add(p);
            P.add(p); // SOLID PHYSICS

            const light = new THREE.PointLight(color, 2, 15);
            light.position.set(0, 3.8, 0);
            group.add(light);

            group.position.set(x, 0, z);
            scene.add(group);
        }

        buildRoom("Lobby", 0, 0, 15, 0x00f2ff);
        buildRoom("Store", -18, 0, 12, 0xff00ff);
        buildRoom("Poker", 18, 0, 12, 0x00ff00);
        buildRoom("Vault", 0, 18, 12, 0xffd700);

        // --- 5. OCULUS CONTROLLERS ---
        const modelFactory = new XRControllerModelFactory();
        const cLeft = renderer.xr.getController(1);
        const gLeft = renderer.xr.getControllerGrip(1);
        gLeft.add(modelFactory.createControllerModel(gLeft));
        playerRig.add(cLeft, gLeft);

        const cRight = renderer.xr.getController(0);
        const gRight = renderer.xr.getControllerGrip(0);
        gRight.add(modelFactory.createControllerModel(gRight));
        playerRig.add(cRight, gRight);

        // RIGHT TRIGGER = OK BUTTON
        cRight.addEventListener('selectstart', () => {
            console.log("OK Pressed");
            // Check for table interaction
        });

        // --- 6. MOVEMENT & COLLISION ---
        function updateMovement() {
            const session = renderer.xr.getSession();
            if (!session) return;

            for (const source of session.inputSources) {
                if (source.gamepad && source.handedness === 'left') {
                    const axes = source.gamepad.axes;
                    const moveX = axes[2] || 0;
                    const moveZ = axes[3] || 0;

                    const nextPos = playerRig.position.clone();
                    const dir = new THREE.Vector3(moveX, 0, moveZ).applyQuaternion(camera.quaternion);
                    dir.y = 0;
                    nextPos.addScaledVector(dir, 0.1);

                    // PHYSICS CHECK before moving
                    if (!P.check(nextPos)) {
                        playerRig.position.copy(nextPos);
                    }
                }
            }
        }

        // --- 7. RENDER LOOP ---
        renderer.setAnimationLoop(() => {
            updateMovement();
            renderer.render(scene, camera);
        });
    </script>
</body>
</html>
