// Wrist HUD Interactions
document.addEventListener('DOMContentLoaded', () => {
  const chipText = document.getElementById('chipCount');
  const potText = document.getElementById('potAmount');

  const btnFold = document.getElementById('btnFold');
  const btnCall = document.getElementById('btnCall');
  const btnRaise = document.getElementById('btnRaise');

  // Update HUD function
  function updateHUD() {
    chipText.setAttribute('value', `Chips: ${game.players[0].chips}`);
    potText.setAttribute('value', `Pot: ${game.pot}`);
  }

  btnFold.addEventListener('click', () => {
    console.log('Player folds');
    game.nextTurn();
    updateHUD();
  });

  btnCall.addEventListener('click', () => {
    const amount = 50; // default call
    game.bet(0, amount);
    game.nextTurn();
    updateHUD();
  });

  btnRaise.addEventListener('click', () => {
    const amount = 100; // default raise
    game.bet(0, amount);
    game.nextTurn();
    updateHUD();
  });

  setInterval(updateHUD, 500);
});
