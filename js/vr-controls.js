AFRAME.registerComponent('play-game-zone', {
    init: function () {
        this.el.classList.add('clickable');
    },
    tick: function () {
        const rig = document.querySelector('#rig');
        const playerPos = rig.object3D.position;
        const tablePos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(tablePos);
        
        // If player walks within 2 meters of table, they automatically sit
        let dist = playerPos.distanceTo(tablePos);
        if (dist < 2.5) {
            // Anchor to table: 1.2m away from center
            rig.setAttribute('position', {
                x: tablePos.x, 
                y: 0, 
                z: tablePos.z + 1.2
            });
            console.log("System: Player seated. Preparing deck...");
            if(window.pokerLogic) window.pokerLogic.startDeal();
        }
    }
});
