AFRAME.registerComponent('world-builder', {
  init: function () {
    const sceneEl = this.el;

    // 1. LOBBY (Brand Logo & Daily Pick)
    this.createArea(sceneEl, "Lobby", "0 0 0", "#carpetTex", "#brickTex", "#logoTex", false);

    // 2. STORE ROOM (Four Corners + Interface)
    this.createArea(sceneEl, "Store", "20 0 0", "#carpetTex", "#brickTex", null, false, "STORE INTERFACE\n1. Buy Chips\n2. Skins\n3. Avatars");

    // 3. SCORPION ROOM (Randomized Textures + Poker Table)
    // Using wall_stone_runes.jpg for a different look
    this.createArea(sceneEl, "ScorpionRoom", "0 0 -25", "#carpetTex", "#stoneTex", "#artTex", true);
  },

  createArea: function (scene, name, pos, floorTex, wallTex, artTex, hasTable, interfaceText) {
    let area = document.createElement('a-entity');
    area.setAttribute('position', pos);
    area.setAttribute('id', name);

    // Floor
    let floor = document.createElement('a-plane');
    floor.setAttribute('rotation', '-90 0 0');
    floor.setAttribute('width', '15');
    floor.setAttribute('height', '15');
    floor.setAttribute('material', `src: ${floorTex}; repeat: 4 4`);
    floor.setAttribute('class', 'floor');
    area.appendChild(floor);

    // Walls (Double-tiled bricks for realistic scale)
    this.createWall(area, "0 4 -7.5", "0 0 0", wallTex, artTex);   // North
    this.createWall(area, "0 4 7.5", "0 180 0", wallTex, null);    // South
    this.createWall(area, "7.5 4 0", "0 -90 0", wallTex, null);    // East
    this.createWall(area, "-7.5 4 0", "0 90 0", wallTex, null);   // West

    // Store Interface Logic
    if (interfaceText) {
      let ui = document.createElement('a-entity');
      ui.setAttribute('position', '0 2 -7.4');
      ui.setAttribute('text', `value: ${interfaceText}; color: #FFD700; align: center; width: 6; font: monoid`);
      area.appendChild(ui);
    }

    // Poker Table (Scorpion Room Only)
    if (hasTable) {
      let table = document.createElement('a-cylinder');
      table.setAttribute('position', '0 0.8 0');
      table.setAttribute('radius', '2.5');
      table.setAttribute('height', '0.1');
      table.setAttribute('material', 'src: #feltTex');
      table.setAttribute('table-trigger', ''); // Auto-sit logic [cite: 2025-12-30]
      area.appendChild(table);
    }

    scene.appendChild(area);
  },

  createWall: function (parent, pos, rot, tex, art) {
    let wall = document.createElement('a-plane');
    wall.setAttribute('position', pos);
    wall.setAttribute('rotation', rot);
    wall.setAttribute('width', '15');
    wall.setAttribute('height', '8');
    wall.setAttribute('material', `src: ${tex}; repeat: 8 4; side: double`);
    parent.appendChild(wall);

    if (art) {
      let frame = document.createElement('a-box');
      frame.setAttribute('position', '0 0.5 0.05');
      frame.setAttribute('width', '4.2');
      frame.setAttribute('height', '3.2');
      frame.setAttribute('depth', '0.05');
      frame.setAttribute('color', '#111');
      
      let pic = document.createElement('a-plane');
      pic.setAttribute('position', '0 0 0.06');
      pic.setAttribute('width', '4');
      pic.setAttribute('height', '3');
      pic.setAttribute('material', `src: ${art}`);
      
      frame.appendChild(pic);
      wall.appendChild(frame);
    }
  }
});
