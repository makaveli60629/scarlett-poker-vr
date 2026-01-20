AFRAME.registerComponent("scarlett-walk-loop", {
  schema: { radius:{type:"number", default:6.3}, speed:{type:"number", default:0.22}, y:{type:"number", default:0}, smooth:{type:"number", default:8} },
  init: function(){
    this.t = Math.random()*Math.PI*2;
    this.center = new THREE.Vector3(0, this.data.y, -8);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
  },
  tick: function(time, dt){
    const dts = (dt||16)/1000;
    this.t += this.data.speed*dts;
    const tx = this.center.x + Math.cos(this.t)*this.data.radius;
    const tz = this.center.z + Math.sin(this.t)*this.data.radius;

    // critically damped smoothing (simple lerp towards target)
    const target = this.pos.set(tx, this.data.y, tz);
    const obj = this.el.object3D;
    obj.position.lerp(target, 1 - Math.exp(-this.data.smooth*dts));

    // Face direction of travel smoothly
    const lx = this.center.x + Math.cos(this.t+0.35)*this.data.radius;
    const lz = this.center.z + Math.sin(this.t+0.35)*this.data.radius;
    const look = new THREE.Vector3(lx, this.data.y, lz);
    const m = new THREE.Matrix4().lookAt(obj.position, look, new THREE.Vector3(0,1,0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    obj.quaternion.slerp(q, 1 - Math.exp(-this.data.smooth*dts));
  }
});
