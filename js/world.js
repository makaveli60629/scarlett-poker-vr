AFRAME.registerComponent('world-logic', {
    init: function () {
        const sceneEl = this.el;

        // --- 1. THE ROOM CONSTRUCTION ---
        this.createEnvironment(sceneEl);
        
        // --- 2. THE OVAL LEATHER TABLE ---
        this.createPokerTable(sceneEl);

        // --- 3. THE STORE & LEADERBOARD ---
        this.createUI(sceneEl);

        // --- 4. CONTROLLER BUTTON LOGIC (FOR NIGHT MODE) ---
        this.setupControllerEvents();
    },

    createEnvironment: function(scene) {
        // Floor (Teleport Surface)
        let floor = document.createElement('a-plane');
        floor.setAttribute('class', 'teleport-surface');
        floor.setAttribute('rotation', '-90 0 0');
        floor.setAttribute('width', '40');
        floor.setAttribute('height', '40');
        floor.setAttribute('material', 'src: #carpetTex; repeat: 15 15;');
        scene.appendChild(floor);

        // Brick Walls with Neon Trim Triggers
        this.addWall(scene, "0 2.5 -8", "0 0 0"); // Back Wall
        this.addWall(scene, "-10 2.5 0", "0 90 0"); // Left Wall
        this.addWall(scene, "10 2.5 0", "0 -90 0"); // Right Wall
    },

    addWall: function(scene, pos, rot) {
        let wall = document.createElement('a-box');
        wall.setAttribute('position', pos);
        wall.setAttribute('rotation', rot);
        wall.setAttribute('width', '20');
        wall.setAttribute('height', '5');
        wall.setAttribute('depth', '0.2');
        wall.setAttribute('material', 'src: #brickWall; repeat: 4 2;');
        
        // Corner Neon Trims
        let neon = document.createElement('a-box');
        neon.setAttribute('position', '-9.9 0 0.15');
        neon.setAttribute('width', '0.05');
        neon.setAttribute('height', '5');
        neon.setAttribute('material', 'emissive: #00ffff; emissiveIntensity: 3;');
        wall.appendChild(neon);
        
        scene.appendChild(wall);
    },

    createPokerTable: function(scene) {
        let tableGroup = document.createElement('a-entity');
        tableGroup.setAttribute('position', '0 0.9 0');

        // Oval Felt
        let felt = document.createElement('a-capsule');
        felt.setAttribute('radius', '0.8');
        felt.setAttribute('height', '1.6');
        felt.setAttribute('rotation', '90 0 0');
        felt.setAttribute('scale', '1 1 0.1');
        felt.setAttribute('material', 'src: #pokerFelt; color: #076324;');
        
        // Leather Trim
        let trim = document.createElement('a-capsule');
        trim.setAttribute('radius', '0.88');
        trim.setAttribute('height', '1.68');
        trim.setAttribute('rotation', '90 0 0');
        trim.setAttribute('scale', '1 1 0.08');
        trim.setAttribute('position', '0 -0.02 0');
        trim.setAttribute('material', 'src: #leatherTex; color: #221100;');

        tableGroup.appendChild(felt);
        tableGroup.appendChild(trim);
        scene.appendChild(tableGroup);
    },

    createUI: function(scene) {
        // Floating Leaderboard
        let lb = document.createElement('a-plane');
        lb.setAttribute('position', '4 2.5 -5');
        lb.setAttribute('rotation', '0 -20 0');
        lb.setAttribute('width', '3');
        lb.setAttribute('height', '2');
        lb.setAttribute('color', '#111');
        lb.innerHTML = '<a-text value="LEADERBOARD" align="center" position="0 0.8 0.01"></a-text>';
        scene.appendChild(lb);
    },

    setupControllerEvents: function() {
        // Watch update logic
        setInterval(() => {
            const watch = document.querySelector('#watchTime');
            if(watch) {
                let d = new Date();
                watch.setAttribute('value', d.getHours() + ":" + d.getMinutes().toString().padStart(2, '0'));
            }
        }, 1000);

        // Menu Toggle logic for Left Controller A/X button
        const leftHand = document.querySelector('#leftHand');
        leftHand.addEventListener('abuttondown', function() {
            const menu = document.querySelector('#wristMenu');
            menu.setAttribute('visible', !menu.getAttribute('visible'));
        });
    }
});
