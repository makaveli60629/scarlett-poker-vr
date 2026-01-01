// Poker Logic & Win State Visualizer
export function handleWin(winnerName, winningHand, cards) {
    const display = document.getElementById('win-display');
    
    // Set text for winner
    display.innerHTML = `
        <span style="color: #FFD700;">WINNER: ${winnerName}</span><br>
        <small>${winningHand}</small>
    `;
    display.style.display = 'block';

    // Highlight winning hand/cards (Shaders/Noise to be added in 1.4)
    console.log(`Highlighting cards: ${cards}`);

    // Keep on screen for exactly 10 seconds per your instructions
    setTimeout(() => {
        display.style.display = 'none';
    }, 10000);
}
