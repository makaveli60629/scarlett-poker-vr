AFRAME.registerComponent('world-builder', {
  init: function () {
    const sceneEl = this.el;

    // Create 4 Rooms: Lobby, Store, 2 Poker Rooms
    const areas = [
      { name: 'Lobby', pos: '0 0 0', table: false },
      { name: 'PokerRoom1', pos: '20 0 0', table: true }
    ];

    areas.forEach(data => {
      let room = document.createElement('a-entity');
      room.setAttribute('position', data.pos);

      // 1. FLOOR: Using lobby_carpet.jpg
      let floor = document.createElement('a-plane');
      floor.setAttribute('rotation', '-90 0 0');
      floor.setAttribute('width', '15');
      floor.setAttribute('height', '15');
      floor.setAttribute('material', 'src: #carpetTex; repeat: 4 4; roughness: 1');
      room.appendChild(floor);

      // 2. WALLS: Using brickwall.jpg
      this.createWall(room, "0 4 -7.5", "0 0 0", true);   // North (With Art)
      this.createWall(room, "0 4 7.5", "0 180 0", false); // South
      this.createWall(room, "7.5 4 0", "0 -90 0", false); // East
      this.createWall(room, "-7.5 4 0", "0 90 0", false); // West

      // 3. TABLE: Green Felt Cylinder
      if (data.table) {
        let table = document.createElement('a-cylinder');
        table.setAttribute('position', '0 0.8 0');
        table.setAttribute('radius', '2.5');
        table.setAttribute('height', '0.1');
        table.setAttribute('material', 'src: #feltTex; roughness: 0.8');
        table.setAttribute('table-trigger', ''); // Auto-sit logic
        room.appendChild(table);
      }

      sceneEl.appendChild(room);
    });
  },

  createWall: function (parent, pos, rot, hasArt) {
    let wall = document.createElement('a-plane');
    wall.setAttribute('position', pos);
    wall.setAttribute('rotation', rot);
    wall.setAttribute('width', '15');
    wall.setAttribute('height', '8');
    wall.setAttribute('material', 'src: #brickTex; side: double');
    parent.appendChild(wall);

    // Add Casino Art in a Frame
    if (hasArt) {
      let art = document.createElement('a-plane');
      art.setAttribute('position', '0 0.5 0.1'); // Slightly in front of wall
      art.setAttribute('width', '4');
      art.setAttribute('height', '3');
      art.setAttribute('material', 'src: #artTex; side: double');
      // Simple Frame
      let frame = document.createElement('a-box');
      frame.setAttribute('position', '0 0.5 0.05');
      frame.setAttribute('width', '4.2');
      frame.setAttribute('height', '3.2');
      frame.setAttribute('depth', '0.05');
      frame.setAttribute('color', '#333');
      wall.appendChild(frame);
      wall.appendChild(art);
    }
  }
});
