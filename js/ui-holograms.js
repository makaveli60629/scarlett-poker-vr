AFRAME.registerComponent('wallet-hologram-display', {
  init: function () {
    this.updateDisplay();
    window.addEventListener('walletUpdated', () => this.updateDisplay());
  },
  updateDisplay: function () {
    let balance = localStorage.getItem('poker_wallet') || 1000;
    this.el.setAttribute('text', {
      value: "WALLET: $" + balance,
      align: 'center',
      color: '#00FF00',
      width: 5,
      shader: 'msdf'
    });
  }
});
