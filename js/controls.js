// js/controls.js
AFRAME.registerComponent('hand-listener', {
    init: function () {
        this.el.addEventListener('triggerdown', function (evt) {
            console.log('Trigger Pressed on Hand');
        });
    }
});

// Force refresh the raycasters for the hands
document.addEventListener('DOMContentLoaded', () => {
    const hands = document.querySelectorAll('[oculus-touch-controls]');
    hands.forEach(hand => {
        hand.setAttribute('hand-listener', '');
    });
});
