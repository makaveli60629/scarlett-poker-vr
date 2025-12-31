AFRAME.registerComponent('wallet-hologram-display', {
  init: function () {
    this.update();
    window.addEventListener('walletUpdated', () => this.update());
  },
  update: function () {
    let balance = localStorage.getItem('poker_wallet') || 1000;
    this.el.setAttribute('text', {
      value: "MAKAVELI 60629\nBANK: $" + balance,
      align: 'center', color: '#00FFFF', width: 4
    });
  }
});
