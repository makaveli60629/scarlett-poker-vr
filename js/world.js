AFRAME.registerComponent('world-setup', {
    init: function () {
        const sceneEl = this.el;

        // 1. OVAL TABLE WITH LEATHER TRIM
        let table = document.createElement('a-entity');
        table.setAttribute('id', 'pokerTable');
        table.setAttribute('position', '0 0.9 0');
        
        // Felt Surface
        let felt = document.createElement('a-capsule');
        felt.setAttribute('radius', '0.8');
        felt.setAttribute('height', '1.5');
        felt.setAttribute('rotation', '90 0 0');
        felt.setAttribute('scale', '1 1 0.1');
        felt.setAttribute('material', 'color: #076324; roughness: 0.8;');
        
        // Leather Trim
        let trim = document.createElement('a-capsule');
        trim.setAttribute('radius', '0.85');
        trim.setAttribute('height', '1.55');
        trim.setAttribute('rotation', '90 0 0');
        trim.setAttribute('scale', '1 1 0.08');
        trim.setAttribute('material', 'src: #leatherTex; color: #221100;');
        trim.setAttribute('position', '0 -0.02 0');

        table.appendChild(felt);
        table.appendChild(trim);
        sceneEl.appendChild(table);

        // 2. FLOOR (Carpet)
        let floor = document.createElement('a-box');
        floor.setAttribute('class', 'teleport-surface');
        floor.setAttribute('width', '20');
        floor.setAttribute('height', '0.1');
        floor.setAttribute('depth', '20');
        floor.setAttribute('material', 'src: #carpetTex; repeat: 10 10;');
        sceneEl.appendChild(floor);

        // 3. WALLS (Brick + Neon Corners)
        this.createWall(sceneEl, "0 2.5 -10", "0 0 0");   // Back
        this.createWall(sceneEl, "-10 2.5 0", "0 90 0");  // Left
        this.createWall(sceneEl, "10 2.5 0", "0 -90 0");  // Right
    },

    createWall: function(scene, pos, rot) {
        let wall = document.createElement('a-box');
        wall.setAttribute('position', pos);
        wall.setAttribute('rotation', rot);
        wall.setAttribute('width', '20');
        wall.setAttribute('height', '5');
        wall.setAttribute('depth', '0.2');
        wall.setAttribute('material', 'src: #brickWall; repeat: 4 2;');

        // Neon Trim on each corner
        let neon = document.createElement('a-box');
        neon.setAttribute('position', '-9.9 0 0.2');
        neon.setAttribute('width', '0.05');
        neon.setAttribute('height', '5');
        neon.setAttribute('depth', '0.05');
        neon.setAttribute('material', 'emissive: #00ffff; emissiveIntensity: 2;');
        
        wall.appendChild(neon);
        scene.appendChild(wall);
    }
});
