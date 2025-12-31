AFRAME.registerComponent('chip-stack-logic', {
  init: function () {
    for (let i = 0; i < 5; i++) {
        let chip = document.createElement('a-cylinder');
        chip.setAttribute('radius', '0.08');
        chip.setAttribute('height', '0.02');
        chip.setAttribute('position', `0 ${i * 0.025} 0`);
        chip.setAttribute('color', i % 2 === 0 ? 'red' : 'white');
        this.el.appendChild(chip);
    }
  }
});
