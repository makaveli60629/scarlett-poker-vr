AFRAME.registerComponent("scarlett-walk-loop", {
  schema: { radius: {type:"number", default:6}, speed:{type:"number", default:0.35}, y:{type:"number", default:0} },
  init: function(){ this.t = Math.random()*Math.PI*2; this.center = new THREE.Vector3(0, this.data.y, -8); },
  tick: function(time, dt){
    const dts = (dt||16)/1000;
    this.t += this.data.speed*dts;
    const x = this.center.x + Math.cos(this.t)*this.data.radius;
    const z = this.center.z + Math.sin(this.t)*this.data.radius;
    this.el.object3D.position.set(x, this.data.y, z);
    const lx = this.center.x + Math.cos(this.t+0.4)*this.data.radius;
    const lz = this.center.z + Math.sin(this.t+0.4)*this.data.radius;
    this.el.object3D.lookAt(lx, this.data.y, lz);
  }
});
