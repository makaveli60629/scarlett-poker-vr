/**
 * ═══════════════════════════════════════════════════
 *  SCARLETT VR - PHYSICS MODULE v1.0
 *  Advanced Collision Detection & Movement Control
 * ═══════════════════════════════════════════════════
 */

const ScarlettPhysics = {
    
    // ═══ CONFIGURATION ═══
    config: {
        wallThickness: 1.2,
        checkInterval: 50, // Check every 50ms for smoother detection
        snapBackSpeed: 0.1,
        maxSpeed: 0.15
    },

    // ═══ ROOM BOUNDARIES (Precise collision boxes) ═══
    boundaries: {
        lobby: {
            minX: -9.5, maxX: 9.5,
            minZ: -9.5, maxZ: 9.5,
            minY: 0, maxY: 5
        },
        vault: {
            minX: 42.5, maxX: 57.5,
            minZ: 42.5, maxZ: 57.5,
            minY: 0, maxY: 5
        },
        scorpion: {
            minX: -57.5, maxX: -42.5,
            minZ: -57.5, maxZ: -42.5,
            minY: 0, maxY: 5
        }
    },

    // ═══ STATE ═══
    lastValidPosition: { x: 0, y: 0, z: 5 },
    isActive: false,
    collisionCount: 0,

    // ═══ INITIALIZE PHYSICS ENGINE ═══
    init(rig, currentZone) {
        if (!rig) {
            console.error('❌ Physics: No rig found');
            return;
        }

        this.rig = rig;
        this.currentZone = currentZone || 'lobby';
        this.isActive = true;

        // Store initial position
        this.lastValidPosition = rig.getAttribute('position');

        // Start monitoring
        this.startCollisionMonitoring();

        console.log('🛡️ Physics Engine: ACTIVE');
    },

    // ═══ COLLISION MONITORING ═══
    startCollisionMonitoring() {
        this.monitoringInterval = setInterval(() => {
            if (!this.isActive || !this.rig) return;

            const currentPos = this.rig.getAttribute('position');
            
            if (this.isOutOfBounds(currentPos)) {
                this.handleCollision(currentPos);
            } else {
                // Update last valid position
                this.lastValidPosition = {
                    x: currentPos.x,
                    y: currentPos.y,
                    z: currentPos.z
                };
            }
        }, this.config.checkInterval);
    },

    // ═══ BOUNDARY CHECK ═══
    isOutOfBounds(position) {
        const bounds = this.boundaries[this.currentZone];
        if (!bounds) return false;

        return (
            position.x < bounds.minX || position.x > bounds.maxX ||
            position.z < bounds.minZ || position.z > bounds.maxZ ||
            position.y < bounds.minY || position.y > bounds.maxY
        );
    },

    // ═══ COLLISION HANDLER ═══
    handleCollision(position) {
        this.collisionCount++;
        
        console.warn(`⚠️ COLLISION #${this.collisionCount} detected at`, position);
        
        // INSTANT SNAP BACK
        this.rig.setAttribute('position', this.lastValidPosition);

        // Notify player
        if (window.SCARLETT) {
            window.SCARLETT.notify('🚫 SOLID WALL', 1000);
            window.SCARLETT.hapticPulse(0.8, 150);
        }

        // Play collision sound (if available)
        this.playCollisionSound();
    },

    // ═══ UPDATE ZONE ═══
    updateZone(newZone) {
        this.currentZone = newZone;
        console.log(`🗺️ Physics zone updated: ${newZone}`);
        
        // Update last valid position to new zone spawn
        const rig = this.rig;
        if (rig) {
            this.lastValidPosition = rig.getAttribute('position');
        }
    },

    // ═══ TOGGLE PHYSICS ═══
    pause() {
        this.isActive = false;
        console.log('⏸️ Physics paused');
    },

    resume() {
        this.isActive = true;
        console.log('▶️ Physics resumed');
    },

    // ═══ CLEANUP ═══
    destroy() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        this.isActive = false;
        console.log('🛡️ Physics Engine: DESTROYED');
    },

    // ═══ COLLISION SOUND ═══
    playCollisionSound() {
        // Create a brief "thud" sound using Web Audio API
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.value = 80; // Low frequency for "thud"
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            // Audio not supported
        }
    },

    // ═══ UTILITIES ═══
    getCollisionStats() {
        return {
            totalCollisions: this.collisionCount,
            currentZone: this.currentZone,
            isActive: this.isActive,
            lastValidPosition: this.lastValidPosition
        };
    },

    // ═══ ADVANCED: SMOOTH BOUNDARY PUSH ═══
    // Instead of instant snap, smoothly push player back
    smoothPushBack(currentPos) {
        const bounds = this.boundaries[this.currentZone];
        if (!bounds) return currentPos;

        const correctedPos = { ...currentPos };

        // Clamp X
        if (currentPos.x < bounds.minX) correctedPos.x = bounds.minX + 0.1;
        if (currentPos.x > bounds.maxX) correctedPos.x = bounds.maxX - 0.1;

        // Clamp Z
        if (currentPos.z < bounds.minZ) correctedPos.z = bounds.minZ + 0.1;
        if (currentPos.z > bounds.maxZ) correctedPos.z = bounds.maxZ - 0.1;

        // Clamp Y
        if (currentPos.y < bounds.minY) correctedPos.y = bounds.minY;
        if (currentPos.y > bounds.maxY) correctedPos.y = bounds.maxY;

        return correctedPos;
    }
};

// ═══ EXPOSE TO WINDOW ═══
window.ScarlettPhysics = ScarlettPhysics;
