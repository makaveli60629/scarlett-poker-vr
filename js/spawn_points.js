export const SpawnPoints = {
    apply(camera) {
        // Sets player at human height (1.6) and slightly back (2)
        camera.position.set(0, 1.6, 2); 
        console.log('[SPAWN] Player positioned at table.');
    }
};
