/**
 * /js/world.js — ScarlettVR World Module v10.5
 * Core Environment: Sunken Pit, Gold Table, 6 Humanoids
 */
export const World = {
    scene: null,
    THREE: null,
    bots: [],
    
    async init({ THREE, scene }) {
        this.THREE = THREE;
        this.scene = scene;

        this.buildLighting();
        this.buildEnvironment();
        this.spawnBots();

        console.log("[World] Environment and Bots initialized.");
        
        // Return an API for index.js to call
        return {
            update: (dt, t) => this.update(dt, t)
        };
    },

    buildLighting() {
        const T = this.THREE;
        // Cinematic Hemisphere Light (Sky/Ground)
        const hemi = new T.HemisphereLight(0xdaf0ff, 0x0b0f1a, 1.2);
        this.scene.add(hemi);

        // Sunlight
        const sun = new T.DirectionalLight(0xffffff, 1.2);
        sun.position.set(35, 70, 35);
        this.scene.add(sun);

        // Neon Pit Glow
        const pitLight = new T.PointLight(0x66ccff, 2, 15);
        pitLight.position.set(0, 5, 0);
        this.scene.add(pitLight);
    },

    buildEnvironment() {
        const T = this.THREE;

        // 1. Grid Floor
        const grid = new T.GridHelper(100, 50, 0x00ffff, 0x112222);
        this.scene.add(grid);

        // 2. The Main Floor
        const floorGeo = new T.PlaneGeometry(100, 100);
        const floorMat = new T.MeshStandardMaterial({ color: 0x0a0c12 });
        const floor = new T.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 3. Sunken Pit Rail (Cyan Neon)
        const railGeo = new T.TorusGeometry(6.5, 0.05, 16, 100);
        const railMat = new T.MeshStandardMaterial({ 
            color: 0x00ffff, 
            emissive: 0x00ffff, 
            emissiveIntensity: 0.5 
        });
        const rail = new T.Mesh(railGeo, railMat);
        rail.rotation.x = Math.PI / 2;
        rail.position.y = 1.0;
        this.scene.add(rail);

        // 4. Gold Poker Table
        const tableGroup = new T.Group();
        const top = new T.Mesh(
            new T.CylinderGeometry(3, 3, 0.4, 32),
            new T.MeshStandardMaterial({ color: 0xd2b46a, metalness: 0.8, roughness: 0.2 })
        );
        top.position.y = 0.2;
        tableGroup.add(top);
        this.scene.add(tableGroup);
    },

    spawnBots() {
        const T = this.THREE;
        const botMat = new T.MeshStandardMaterial({ color: 0xe6e6e6, roughness: 0.8 });

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const bot = new T.Group();

            // Torso (Capsule)
            const torso = new T.Mesh(new T.CapsuleGeometry(0.18, 0.42, 6, 10), botMat);
            torso.position.y = 1.15;
            
            // Head (Icosahedron)
            const head = new T.Mesh(new T.IcosahedronGeometry(0.12, 0), botMat);
            head.position.y = 1.62;

            bot.add(torso, head);
            
            // Position bots in a circle around the table
            const radius = 4.5;
            bot.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            bot.lookAt(0, 1.2, 0); // Face the table center

            this.scene.add(bot);
            this.bots.push({ mesh: bot, offset: i });
        }
    },

    update(dt, t) {
        // Idle breathing/floating animation for bots
        this.bots.forEach((b) => {
            b.mesh.position.y = Math.sin(t + b.offset) * 0.03;
        });
    }
};
