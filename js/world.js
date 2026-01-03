import * as THREE from 'three';

export class PokerWorld {
    constructor(scene) {
        this.scene = scene;
        this.loader = new THREE.TextureLoader();
        this.rooms = {};
        this.buildWorld();
    }

    safeMaterial(texturePath, fallbackColor) {
        const mat = new THREE.MeshStandardMaterial({ color: fallbackColor });
        this.loader.load(
            texturePath,
            tex => { mat.map = tex; mat.needsUpdate = true; },
            undefined,
            () => console.warn("Texture failed:", texturePath)
        );
        return mat;
    }

    buildWorld() {
        this.buildLights();
        this.buildLobby();
        this.buildStoreRoom();
        this.buildPokerRoom();
        this.buildScorpionRoom();
    }

    buildLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const light = new THREE.PointLight(0xffffff, 1.2);
        light.position.set(0, 5, 0);
        this.scene.add(light);

        // Neon corner accent
        const neonGeo = new THREE.BoxGeometry(0.1, 4, 0.1);
        const neonMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive:0xff00ff, emissiveIntensity:1 });
        const positions = [[-15,2,-15],[15,2,-15],[15,2,15],[-15,2,15]];
        positions.forEach(p=>{
            const neon = new THREE.Mesh(neonGeo, neonMat);
            neon.position.set(...p);
            this.scene.add(neon);
        });
    }

    buildLobby() {
        const floorMat = this.safeMaterial(
            'assets/textures/lobby_carpet.jpg', 0x444444
        );
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(30,30), floorMat);
        floor.rotation.x = -Math.PI/2; floor.position.y=0;
        this.scene.add(floor);

        // Walls
        const wallMat = this.safeMaterial('assets/textures/brickwall.jpg', 0x222222);
        const geo = new THREE.BoxGeometry(30,4,0.5);
        const positions = [
            [0,2,-15,0],
            [0,2,15,0],
            [-15,2,0,Math.PI/2],
            [15,2,0,Math.PI/2]
        ];
        positions.forEach(p=>{
            const wall = new THREE.Mesh(geo, wallMat);
            wall.position.set(p[0],p[1],p[2]);
            wall.rotation.y=p[3];
            wall.userData.solid=true;
            this.scene.add(wall);
        });

        // Table
        const feltMat = this.safeMaterial('assets/textures/table_felt_green.jpg',0x006600);
        const table = new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.4,0.15,32), feltMat);
        table.position.set(0,0.8,0);
        table.userData.solid=true;
        this.scene.add(table);

        const trimMat = this.safeMaterial('assets/textures/Table leather trim.jpg',0x4a2a18);
        const trim = new THREE.Mesh(new THREE.TorusGeometry(1.7,0.12,16,64),trimMat);
        trim.rotation.x=Math.PI/2; trim.position.y=0.88;
        this.scene.add(trim);

        // Spawn marker
        const spawn = new THREE.Mesh(new THREE.SphereGeometry(0.12,12,12), new THREE.MeshBasicMaterial({color:0xff0000}));
        spawn.position.set(0,1.6,10);
        this.scene.add(spawn);
        this.rooms.lobby={spawn};
    }

    buildStoreRoom() {
        // Simple room setup for teleport
        const mat = this.safeMaterial('assets/textures/brickwall.jpg',0x333333);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(15,15), mat);
        floor.rotation.x=-Math.PI/2; floor.position.set(0,0,25);
        this.scene.add(floor);
        this.rooms.store={spawn:{x:0,y:1.6,z:25}};
    }

    buildPokerRoom() {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(15,15), new THREE.MeshStandardMaterial({color:0x003300}));
        floor.rotation.x=-Math.PI/2; floor.position.set(25,0,0);
        this.scene.add(floor);
        this.rooms.poker={spawn:{x:25,y:1.6,z:0}};
    }

    buildScorpionRoom() {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(15,15), new THREE.MeshStandardMaterial({color:0x330000}));
        floor.rotation.x=-Math.PI/2; floor.position.set(-25,0,0);
        this.scene.add(floor);
        this.rooms.scorpion={spawn:{x:-25,y:1.6,z:0}};
    }
            }
