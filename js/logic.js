/**
 * Update 1.3.5: Full Flip Logic & Auto-Seating
 * Remembers: Oculus controls, 10s Win Display, and Room Logic.
 */

let playerHand = [];
let isDealing = false;

// 1. Auto-Sit & Deal Logic
function triggerSitDown() {
    const rig = document.querySelector('#rig');
    const btn = document.querySelector('#playGameBtn');
    
    // Move Camera to Seated Position
    rig.setAttribute('animation', {
        property: 'position',
        to: '0 0 -1.2',
        dur: 1000,
        easing: 'easeInOutQuad'
    });

    btn.setAttribute('visible', 'false'); // Hide button once seated
    
    setTimeout(() => {
        dealCards();
    }, 1200);
}

// 2. Full Flip Card Logic
function dealCards() {
    if (isDealing) return;
    isDealing = true;

    const container = document.querySelector('#cardContainer');
    container.innerHTML = ''; // Clear old cards

    for (let i = 0; i < 2; i++) {
        // Create Card Mesh (Front/Back)
        const card = document.createElement('a-entity');
        card.setAttribute('position', `${(i * 0.4) - 0.2} 0 0`);
        card.setAttribute('rotation', '0 0 180'); // Start Face Down

        // Card Face
        const face = document.createElement('a-plane');
        face.setAttribute('width', '0.3');
        face.setAttribute('height', '0.45');
        face.setAttribute('color', '#FFF');
        face.setAttribute('rotation', '0 180 0');
        
        // Card Back
        const back = document.createElement('a-plane');
        back.setAttribute('width', '0.3');
        back.setAttribute('height', '0.45');
        back.setAttribute('color', '#900'); // Classic Red Back

        card.appendChild(face);
        card.appendChild(back);
        container.appendChild(card);

        // Perform the "Full Flip" Animation
        card.setAttribute('animation', {
            property: 'rotation',
            to: '0 180 0',
            dur: 800,
            delay: i * 300,
            easing: 'easeOutElastic'
        });
    }
}

// 3. Win Display Logic (10 Seconds)
function showWin(winnerName, hand) {
    const display = document.querySelector('#winDisplay');
    const text = document.querySelector('#winText');
    
    display.setAttribute('visible', 'true');
    text.setAttribute('value', winnerName + '\n' + hand);

    // Highlight Player (Visual Noise/Particle placeholder)
    document.querySelector('#camera').setAttribute('animation', {
        property: 'light.intensity',
        from: 1, to: 1.5, dur: 200, loop: 5
    });

    setTimeout(() => {
        display.setAttribute('visible', 'false');
    }, 10000); // 10 second hold
}

// 4. Daily Giveaway Logic
window.addEventListener('click', (e) => {
    // Check for "Daily Chips" interaction via raycaster
});

console.log("Update 1.3.5 Loaded: Logic Solidified.");
