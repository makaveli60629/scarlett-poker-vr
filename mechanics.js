AFRAME.registerComponent('pinch-to-move', {
  init: function () {
    this.el.addEventListener('pinchstarted', () => {
      const rig = document.querySelector('#rig');
      const cam = document.querySelector('[camera]');
      const dir = new THREE.Vector3(0, 0, -0.8).applyQuaternion(cam.object3D.quaternion);
      rig.object3D.position.add(dir);
    });
  }
});

AFRAME.registerComponent('solid-wall', {
  init: function () { this.el.setAttribute('static-body', ''); }
});

AFRAME.registerComponent('teleport-logic', {
  init: function () {
    this.el.addEventListener('click', () => { window.location.href = this.el.getAttribute('data-dest'); });
  }
});

AFRAME.registerComponent('auto-sit', {
  init: function () {
    this.el.addEventListener('click', () => {
      const rig = document.querySelector('#rig');
      rig.setAttribute('position', this.el.getAttribute('data-sit-pos'));
      rig.setAttribute('movement-controls', 'enabled: false');
      localStorage.setItem('chips', (parseInt(localStorage.getItem('chips') || 1000) - 1000));
      alert("Sitting Down. $1,000 deducted.");
    });
  }
});
