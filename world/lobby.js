// Inside buildPermanentLobby
const storePortal = new THREE.Group();
// ... (your ring and glow code)
storePortal.userData = { dest: 'STORE' }; // THIS IS THE KEY
storePortal.position.set(5.5, 1.5, 0); 
scene.add(storePortal);
portals.push(storePortal);
