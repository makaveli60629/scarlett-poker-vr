import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

let canTurn = true;
let blueBalance = parseInt(localStorage.getItem('blue_balance')) || 0;

export function setupOculus(renderer, scene, userRig) {
    // Left Controller (Movement / Menu)
    const controller0 = renderer.xr.getController(0);
    scene.add(controller0);

    // Right Controller (Turning / Blue Chips)
    const controller1 = renderer.xr.getController(1);
    
    // BLUE CHIP GIVEAWAY: Triggered by the 'A' Button (Select)
    controller1.addEventListener('selectstart', () => {
        spawnBlueChip(scene, controller1);
    });
    
    scene.add(controller1);
}

function spawnBlueChip(scene, controller) {
    // Update Balance
    blueBalance += 10;
    localStorage.setItem('blue_balance', blueBalance);

    // Physical Chip Effect
    const chipGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 32);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x0000ff, metalness: 0.5 });
    const chip = new THREE.Mesh(chipGeo, chipMat);
    
    // Spawn at controller tip
    chip.position.copy(controller.position);
    scene.add(chip);
    
    console.log("Blue Chips Collected:", blueBalance);
}

export function updateLocomotion(renderer, userRig) {
    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;

        // LEFT THUMBSTICK: Smooth Walking
        if (source.handedness === 'left') {
            const axes = source.gamepad.axes; // [x, y, stickX, stickY]
            const moveX = axes[2] * 0.08;
            const moveZ = axes[3] * 0.08;
            
            userRig.position.x += moveX;
            userRig.position.z += moveZ;
        }

        // RIGHT THUMBSTICK: Snap Turning (360 Fix)
        if (source.handedness === 'right') {
            const axes = source.gamepad.axes;
            if (canTurn && Math.abs(axes[2]) > 0.8) {
                // Rotate 45 degrees
                userRig.rotation.y -= Math.sign(axes[2]) * (Math.PI / 4);
                canTurn = false;
                // Cooldown to prevent spinning too fast
                setTimeout(() => { canTurn = true; }, 300);
            }
        }
    }
}
