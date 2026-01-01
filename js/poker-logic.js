// Update 1.3/1.5 Poker Logic
export function handleWin(winnerName, winningHand) {
    const display = document.getElementById('win-display');
    
    // UI Pop-up (Dealer says nothing)
    display.innerHTML = `
        <span style="color: #FFD700;">WINNER: ${winnerName}</span><br>
        <small style="font-size: 24px;">${winningHand}</small>
    `;
    display.style.display = 'block';

    // Highlight winning player logic can go here
    console.log(`${winnerName} won the pot.`);

    // 10 Second rule
    setTimeout(() => {
        display.style.display = 'none';
    }, 10000);
}
