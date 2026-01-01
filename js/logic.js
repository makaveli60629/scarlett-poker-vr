import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';

class PokerWorld {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505); // Dark but not pitch black
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        this.init();
    }

    init() {
        this.setupLighting();
        this.createRooms();
        this.createPokerTable();
        this.setupHologram();
        this.animate();
    }

    setupLighting() {
        // Main room light
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // Spotlight for the table to make the "Play Zone" pop
        const tableLight = new THREE.SpotLight(0xffffff, 1.5);
        tableLight.position.set(0, 10, -5);
        tableLight.angle = Math.PI / 4;
        this.scene.add(tableLight);
    }

    createRooms() {
        // Red Floor (as you mentioned it's currently showing)
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 }); // Deep Red
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Brick Walls (3 Rooms + Lobby)
        // Using a standard box for the room layouts
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x552222 }); // Placeholder for Brick Texture
        
        // Creating the main lobby and the 3 side rooms
        const createWall = (w, h, d, x, y, z) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
            mesh.position.set(x, y, z);
            this.scene.add(mesh);
        };

        // Back Wall (Lobby)
        createWall(40, 10, 1, 0, 5, -20);
        // Left/Right Walls
        createWall(1, 10, 40, -20, 5, 0);
        createWall(1, 10, 40, 20, 5, 0);
    }

    createPokerTable() {
        // The Green Table
        const tableGeo = new THREE.CylinderGeometry(5, 5, 0.5, 32);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x076324 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 1, -5);
        this.scene.add(table);

        // Table Branding (Logo)
        const logoGeo = new THREE.PlaneGeometry(2, 2);
        const logoMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true,
            opacity: 0.8
            // map: new THREE.TextureLoader().load('your_logo_here.jpg') <- Ready for your file list
        });
        const logo = new THREE.Mesh(logoGeo, logoMat);
        logo.rotation.x = -Math.PI / 2;
        logo.position.set(0, 1.26, -5); // Sitting right on the felt
        this.scene.add(logo);
    }

    setupHologram() {
        // Wallet Hologram near Plane Tables Zone
        const hologramGeo = new THREE.BoxGeometry(1, 0.5, 0.1);
        const hologramMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            wireframe: true, 
            transparent: true, 
            opacity: 0.5 
        });
        const hologram = new THREE.Mesh(hologramGeo, hologramMat);
        hologram.position.set(-5, 3, -10);
        this.scene.add(hologram);
    }

    animate() {
        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, this.camera);
        });
    }
}

// Oculus Control Reminder
// Left Stick: Teleport to Table
// Right Stick: Turn
// A Button: Sit Down
// Trigger: Interact
