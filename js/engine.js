export class ScarlettEngine{
 constructor(){this.ready=[];}
 onReady(f){this.ready.push(f);}
 boot(scene){this.scene=scene;this.ready.forEach(f=>f());console.log("ENGINE READY");}
}