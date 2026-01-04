import * as THREE from 'three';

export const World = {
    textureLoader: new THREE.TextureLoader(),
    grabbableObjects: [],
    collisionObjects: [],
    leaderboard: null,
    storePanel: null,
    dayMode: true, // default day

    loadTex(file, fallbackColor=0x777777){
        let texture;
        try{
            texture = this.textureLoader.load(
                `assets/textures/${file}`,
                t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,5)},
                undefined, ()=>{}
            );
        }catch(e){texture=null;}
        return new THREE.MeshStandardMaterial({
            map: texture && texture.image ? texture : null,
            color: texture && texture.image ? 0xffffff : fallbackColor,
            roughness:0.7,
            metalness:0.2,
            emissive:0x000000
        });
    },

    build(scene){
        // Dark / night background
        scene.background = new THREE.Color(0x0a0a0a);

        // Lights
        scene.add(new THREE.AmbientLight(0x222222,1.2));
        const sun = new THREE.DirectionalLight(0xffffff,1.5);
        sun.position.set(10,20,10); scene.add(sun);
        const point = new THREE.PointLight(0xffffff,2,50);
        point.position.set(0,10,0); scene.add(point);

        // Materials
        const mats = {
            carpet: this.loadTex('carpet_red.jpg',0x990000),
            carpet2: this.loadTex('carpet_blue.jpg',0x223366),
            brick: this.loadTex('brick_wall.jpg',0x777777),
            felt: this.loadTex('felt_green.jpg',0x076324),
            gold: this.loadTex('gold_trim.jpg',0xffd700),
            neon: this.loadTex('neon_sign.jpg',0xff00ff),
            poster: this.loadTex('poster.jpg',0x444444),
            window: this.loadTex('window.jpg',0x555555)
        };

        // Floors
        const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(200,200),mats.carpet);
        floor1.rotation.x=-Math.PI/2; floor1.position.y=0; scene.add(floor1); this.collisionObjects.push(floor1);
        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(200,200),mats.carpet2);
        floor2.rotation.x=-Math.PI/2; floor2.position.y=0; scene.add(floor2); this.collisionObjects.push(floor2);

        // Rooms
        this.createArea(scene,0,0,30,mats.brick);
        this.createArea(scene,40,0,20,mats.brick);
        this.createArea(scene,-40,0,20,mats.brick);

        // Tables
        this.createTable(scene,0,-5,mats.felt);
        this.createTable(scene,40,0,mats.felt);

        // Vault
        const safe = new THREE.Mesh(new THREE.BoxGeometry(2,3,2),mats.gold);
        safe.position.set(-40,1.5,0); scene.add(safe);
        this.grabbableObjects.push(safe); this.collisionObjects.push(safe);

        // 20+ cool features
        this.addFeatures(scene,mats);

        // Leaderboard & store panels
        this.leaderboard = new THREE.Mesh(new THREE.BoxGeometry(2,2,0.1),this.loadTex('poster.jpg',0x222222));
        this.leaderboard.position.set(42,1.5,0); scene.add(this.leaderboard); this.grabbableObjects.push(this.leaderboard);

        this.storePanel = new THREE.Mesh(new THREE.BoxGeometry(2,2,0.1),this.loadTex('poster.jpg',0x222222));
        this.storePanel.position.set(-42,1.5,0); scene.add(this.storePanel); this.grabbableObjects.push(this.storePanel);
    },

    createArea(scene,x,z,size,mat){
        const north = new THREE.Mesh(new THREE.BoxGeometry(size,4,0.5),mat);
        north.position.set(x,2,z-size/2); scene.add(north); this.collisionObjects.push(north);
        const east = new THREE.Mesh(new THREE.BoxGeometry(0.5,4,size),mat);
        east.position.set(x+size/2,2,z); scene.add(east); this.collisionObjects.push(east);
        const west = east.clone(); west.position.x=x-size/2; scene.add(west); this.collisionObjects.push(west);
    },

    createTable(scene,x,z,mat){
        const top = new THREE.Mesh(new THREE.CylinderGeometry(4,4,0.3,16),mat);
        top.position.set(x,1,z); scene.add(top); this.grabbableObjects.push(top); this.collisionObjects.push(top);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.8,1,8),new THREE.MeshStandardMaterial({color:0x111111}));
        leg.position.set(x,0.5,z); scene.add(leg); this.collisionObjects.push(leg);
    },

    addFeatures(scene,mats){
        // Neon signs
        const neon = new THREE.Mesh(new THREE.PlaneGeometry(4,1),mats.neon);
        neon.position.set(0,3,-14); scene.add(neon);

        // Lamps
        for(let i=-1;i<=1;i++){
            const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.5,8),new THREE.MeshStandardMaterial({color:0xffffaa,emissive:0xffff66}));
            lamp.position.set(i*5,3,0); scene.add(lamp);
        }

        // Posters
        const poster1 = new THREE.Mesh(new THREE.PlaneGeometry(2,3),mats.poster);
        poster1.position.set(-14,2,0); poster1.rotation.y=Math.PI/2; scene.add(poster1);

        // Vault Door
        const vaultDoor = new THREE.Mesh(new THREE.BoxGeometry(1,2,0.1),mats.gold);
        vaultDoor.position.set(-41,1,0); scene.add(vaultDoor); this.grabbableObjects.push(vaultDoor); this.collisionObjects.push(vaultDoor);

        // Spotlights
        const spot = new THREE.SpotLight(0xffffff,1.5,50,Math.PI/6,0.5);
        spot.position.set(0,10,0); spot.target.position.set(0,0,0); scene.add(spot); scene.add(spot.target);

        // Particle effects
        for(let i=0;i<50;i++){
            const particle = new THREE.Mesh(new THREE.SphereGeometry(0.05,4,4),mats.neon);
            particle.position.set(Math.random()*20-10,Math.random()*5+1,Math.random()*20-10); scene.add(particle);
        }

        // Grabbable cubes
        for(let i=0;i<5;i++){
            const cube = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),new THREE.MeshStandardMaterial({color:0x00ff00,emissive:0x00ff00}));
            cube.position.set(Math.random()*10-5,1,Math.random()*10-5); scene.add(cube); this.grabbableObjects.push(cube); this.collisionObjects.push(cube);
        }

        // Lockers
        for(let i=-2;i<=2;i++){
            const locker = new THREE.Mesh(new THREE.BoxGeometry(0.5,1,0.5),mats.brick);
            locker.position.set(-42,0.5,i); scene.add(locker); this.grabbableObjects.push(locker); this.collisionObjects.push(locker);
        }

        // Fountains
        const fountain = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.5,8),mats.neon);
        fountain.position.set(15,0.25,-15); scene.add(fountain); this.grabbableObjects.push(fountain); this.collisionObjects.push(fountain);

        // Exit sign
        const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1,0.3),mats.neon);
        exitSign.position.set(0,3,15); scene.add(exitSign);
    }
};
