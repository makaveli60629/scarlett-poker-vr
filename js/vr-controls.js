AFRAME.registerComponent('play-game-zone', {
    tick: function () {
        const rig = document.querySelector('#rig');
        const playerPos = rig.object3D.position;
        const tablePos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(tablePos);
        
        // Automatic seating when moving close to table
        if (playerPos.distanceTo(tablePos) < 2.5) {
            rig.setAttribute('position', {x: tablePos.x, y: 0, z: tablePos.z + 1.2});
            console.log("Seated at branded table.");
            if(window.pokerLogic) window.pokerLogic.startDeal();
        }
    }
});

// Oculus Controller Event Listeners
window.addEventListener('axismove', (e) => {
    // Logic for thumbstick movement if needed beyond aframe-extras
});
