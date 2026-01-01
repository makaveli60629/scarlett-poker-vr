// Update 1.7.1 - Card Physics & Dealer Logic
// Refined Physics (Version 1.6 Legacy) integrated into 1.7 Permanent Form

const PhysicsConfig = {
    cardFriction: 0.05,        // 1. Slide resistance on felt
    cardMass: 0.1,            // 2. Weight of the card
    dealSpeed: 1.2,           // 3. Velocity of deal
    flipRotation: 180,        // 4. Degrees for card flip
    gravityStrength: 9.8,     // 5. Downward force
    bounceFactor: 0.2,        // 6. Impact bounce on table
    airResistance: 0.02,      // 7. Drag during flight
    velocityThreshold: 0.01,  // 8. When to stop card movement
    snapToGrid: false,        // 9. Free-form placement
    collisionRadius: 0.05,    // 10. Card-to-card collision
    shaderGlowIntensity: 1.5, // 11. Analysis 1000x highlight strength
    highlightDuration: 10000, // 12. 10s winner highlight (Permanent)
    dealerWaitTime: 500,      // 13. Delay between card 1 and 2
    textureScale: 1.0,        // 14. Felt texture tiling
    noiseFrequency: 0.5,      // 15. For Mega Particle movement
    oculusHapticForce: 0.8,   // 16. Vibration on card catch
    teleportFadeTime: 300,    // 17. Blackout duration during teleport
    walletUpdateRate: 100,    // 18. Milliseconds between wallet sync
    maxParticles: 5000,       // 19. Limit for performance
    lodDistance: 50           // 20. Level of Detail for meshes
};

// The Automatic Dealer Logic for Update 1.7
function dealCardsToPlayer(playerID) {
    console.log(`Dealing with Speed: ${PhysicsConfig.dealSpeed}...`);
    
    // Card 1
    createCardMesh(playerID, 0); 
    
    // Card 2 (Delayed for realism)
    setTimeout(() => {
        createCardMesh(playerID, 1);
        console.log("Cards dealt. Physics: Active.");
    }, PhysicsConfig.dealerWaitTime);
}

function createCardMesh(playerID, index) {
    // This creates the physical card object in the world
    // Applying the 1.4 textures and 1.6 physics variables
    const card = {
        id: `card_${playerID}_${index}`,
        velocity: PhysicsConfig.dealSpeed,
        rotation: 0
    };
    
    // Animate card sliding to the seat position
    animateCardSlide(card);
}
