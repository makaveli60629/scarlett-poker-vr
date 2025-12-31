window.addEventListener('load', () => {
    const sceneEl = document.querySelector('a-scene');
    sceneEl.addEventListener('loaded', () => {
        spawnPokerRooms();
    });
});

function spawnPokerRooms() {
    const container = document.querySelector('#poker-world-container');
    
    // Stakes Settings
    const rooms = [
        { name: 'Low Stakes', pos: {x: 15, y: 0, z: 0}, color: 'green' },
        { name: 'Med Stakes', pos: {x: 30, y: 0, z: 0}, color: 'blue' },
        { name: 'High Stakes', pos: {x: 45, y: 0, z: 0}, color: 'purple' }
    ];

    rooms.forEach(data => {
        const room = document.createElement('a-entity');
        room.setAttribute('position', data.pos);
        
        // Branded Table
        const table = document.createElement('a-cylinder');
        table.setAttribute('radius', '2');
        table.setAttribute('height', '0.1');
        table.setAttribute('position', '0 0.8 0');
        table.setAttribute('color', data.color);
        
        // "Play Game" Auto-Sit Zone
        const trigger = document.createElement('a-cylinder');
        trigger.setAttribute('radius', '2.5');
        trigger.setAttribute('height', '0.1');
        trigger.setAttribute('visible', 'false');
        trigger.setAttribute('class', 'interactable');
        
        // Auto-Sit Logic
        trigger.addEventListener('mouseenter', () => {
            console.log(`Sitting at ${data.name} table...`);
            const rig = document.querySelector('#rig');
            // Move player to table and lock height
            rig.setAttribute('position', {x: data.pos.x, y: 0, z: data.pos.z + 1.5});
            // Here you would trigger the "dealCards" function
        });

        room.appendChild(table);
        room.appendChild(trigger);
        container.appendChild(room);
    });
}
