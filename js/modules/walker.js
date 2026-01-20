AFRAME.registerComponent("scarlett-walk-loop", {
  schema: {
    radius: {type:"number", default:6.3},
    speed:  {type:"number", default:0.18},
    y:      {type:"number", default:0},
    smooth: {type:"number", default:14},
    flip:   {type:"boolean", default:true} // flip heading if animation walks backward
  },
  init: function(){
    this.t = Math.random()*Math.PI*2;
    this.center = new THREE.Vector3(0, this.data.y, -8);
    this.target = new THREE.Vector3();
    this.up = new THREE.Vector3(0,1,0);
    this.tmpQ = new THREE.Quaternion();
    this.tmpM = new THREE.Matrix4();
    this.look = new THREE.Vector3();
  },
  tick: function(time, dt){
    const dts = (dt||16)/1000;
    this.t += this.data.speed*dts;

    const tx = this.center.x + Math.cos(this.t)*this.data.radius;
    const tz = this.center.z + Math.sin(this.t)*this.data.radius;
    this.target.set(tx, this.data.y, tz);

    const obj = this.el.object3D;

    // Exponential smoothing to target
    const a = 1 - Math.exp(-this.data.smooth * dts);
    obj.position.lerp(this.target, a);

    // Compute heading along path
    const hx = this.center.x + Math.cos(this.t + 0.25)*this.data.radius;
    const hz = this.center.z + Math.sin(this.t + 0.25)*this.data.radius;

    this.look.set(hx, this.data.y, hz);

    // Make it face travel direction; flip if model is authored facing backward
    if (this.data.flip) {
      // look opposite direction (rotate 180)
      const dx = this.look.x - obj.position.x;
      const dz = this.look.z - obj.position.z;
      this.look.set(obj.position.x - dx, this.data.y, obj.position.z - dz);
    }

    this.tmpM.lookAt(obj.position, this.look, this.up);
    this.tmpQ.setFromRotationMatrix(this.tmpM);
    obj.quaternion.slerp(this.tmpQ, a);
  }
});
