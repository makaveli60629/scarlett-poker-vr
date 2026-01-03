// teleport.js
AFRAME.registerComponent('teleport-controls', {
  init() {
    const el = this.el;
    el.addEventListener('click', (evt) => {
      const rig = document.querySelector('#rig');
      if (!evt.detail.intersection) return;

      const point = evt.detail.intersection.point;
      rig.setAttribute('position', {
        x: point.x,
        y: 1.6,
        z: point.z
      });
    });
  }
});
