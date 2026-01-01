AFRAME.registerComponent('oculus-height-fix', {
  init: function () {
    // Forces the camera to standing height if VR is detected
    this.el.addEventListener('enter-vr', () => {
      this.el.setAttribute('position', '0 0 0');
    });
  }
});

AFRAME.registerComponent('table-trigger', {
  init: function () {
    this.el.addEventListener('click', () => {
      let rig = document.querySelector('#rig');
      let tablePos = this.el.getAttribute('position');
      let roomPos = this.el.parentElement.getAttribute('position');
      
      // Auto-Sit logic: Move player to table edge
      rig.setAttribute('position', {
        x: roomPos.x + tablePos.x, 
        y: 0, 
        z: roomPos.z + tablePos.z + 1.5
      });
      console.log("Player sat at table. Hand dealing initiated.");
    });
  }
});
