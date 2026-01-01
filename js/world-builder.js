AFRAME.registerComponent('world-builder', {
  init: function () {
    const sceneEl = this.el;

    // Create 4 Areas (Lobby + 3 Rooms)
    const roomPositions = [
      { name: 'Lobby', pos: '0 0 0', hasTable: false },
      { name: 'Store', pos: '15 0 0', hasTable: true },
      { name: 'HighStakes', pos: '30 0 0', hasTable: true },
      { name: 'Private', pos: '45 0 0', hasTable: true }
    ];

    roomPositions.forEach(data => {
      let room = document.createElement('a-entity');
      room.setAttribute('position', data.pos);

      // Floor - Using your Checker Floor JPG
      let floor = document.createElement('a-plane');
      floor.setAttribute('rotation', '-90 0 0');
      floor.setAttribute('width', '10');
      floor.setAttribute('height', '10');
      floor.setAttribute('src', '#floorTex'); // Links to index.html assets
      room.appendChild(floor);

      // Walls (No Ceiling)
      this.createWall(room, "0 2.5 -5", "0 0 0");  // North
      this.createWall(room, "0 2.5 5", "0 180 0"); // South
      this.createWall(room, "5 2.5 0", "0 -90 0"); // East
      this.createWall(room, "-5 2.5 0", "0 90 0"); // West

      if (data.hasTable) {
        this.createTable(room);
      }

      sceneEl.appendChild(room);
    });
  },

  createWall: function (parent, pos, rot) {
    let wall = document.createElement('a-plane');
    wall.setAttribute('position', pos);
    wall.setAttribute('rotation', rot);
    wall.setAttribute('width', '10');
    wall.setAttribute('height', '5');
    wall.setAttribute('src', '#wallTex'); // Brick wall from textures
    parent.appendChild(wall);
  },

  createTable: function (parent) {
    let table = document.createElement('a-cylinder');
    table.setAttribute('position', '0 0.8 0');
    table.setAttribute('radius', '2');
    table.setAttribute('height', '0.1');
    table.setAttribute('color', '#004d00'); // Green Felt
    table.setAttribute('class', 'clickable');
    // Auto-sit logic trigger
    table.setAttribute('table-trigger', '');
    parent.appendChild(table);
  }
});
