AFRAME.registerComponent('poker-engine', {
  init() {
    this.pot = 0;
    this.bank = 50000;

    this.el.addEventListener('bet', e => {
      if (this.bank >= e.detail.amount) {
        this.bank -= e.detail.amount;
        this.pot += e.detail.amount;
        document.querySelector('#pot-text')
          .setAttribute('value', `TOTAL POT: $${this.pot}`);
      }
    });
  }
});
