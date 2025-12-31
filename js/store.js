// Handles persistent wallet and room access
window.onload = () => {
  if (!localStorage.getItem('poker_wallet')) {
    localStorage.setItem('poker_wallet', '1000');
  }
  console.log("Scarlett Poker Store Logic Initialized");
};
