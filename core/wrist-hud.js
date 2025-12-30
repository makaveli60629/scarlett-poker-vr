const hud = document.createElement('div');
hud.id = 'wristHUD';
hud.style.position = 'absolute';
hud.style.bottom = '20px';
hud.style.left = '50%';
hud.style.transform = 'translateX(-50%)';
hud.style.width = '300px';
hud.style.height = '150px';
hud.style.background = 'rgba(0,0,0,0.7)';
hud.style.color = '#fff';
hud.style.borderRadius = '12px';
hud.style.padding = '10px';
hud.style.display = 'flex';
hud.style.flexDirection = 'column';
hud.style.fontFamily = 'Arial, sans-serif';
hud.innerHTML = `
  <div>Your Chips: <span id="hudChips">1000</span></div>
  <div>Pot: <span id="hudPot">0</span></div>
  <button id="btnFold">Fold</button>
  <button id="btnCheck">Check</button>
  <button id="btnRaise">Raise</button>
`;
document.body.appendChild(hud);

// Example button events
document.getElementById('btnFold').onclick = () => alert('Fold clicked!');
document.getElementById('btnCheck').onclick = () => alert('Check clicked!');
document.getElementById('btnRaise').onclick = () => alert('Raise clicked!');
