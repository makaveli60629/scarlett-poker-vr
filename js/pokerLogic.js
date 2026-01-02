export function handleWinNotification(winnerName, handDescription) {
    const uiContainer = document.getElementById('win-ui');
    
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: absolute; top: 20%; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.8); border: 4px solid gold; padding: 30px;
        color: white; text-align: center; border-radius: 15px;
    `;
    banner.innerHTML = `<h1 style="color:gold; margin:0;">${winnerName} WINS</h1>
                        <p style="font-size:24px;">${handDescription}</p>`;
    
    uiContainer.appendChild(banner);

    // 10 Second rule:
    setTimeout(() => {
        banner.remove();
    }, 10000);
}

export function dealInitialCards() {
    console.log("Cards are being dealt...");
    // Logic for 1.6 goes here
}
