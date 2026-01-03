import * as THREE from 'three';

export class TeleportSystem {
    constructor(renderer,camera,scene,world){
        this.renderer=renderer;
        this.camera=camera;
        this.scene=scene;
        this.world=world;
        this.raycaster=new THREE.Raycaster();
        this.laser=null;
        this.initLaser();
        this.setupController();
    }

    initLaser(){
        const mat = new THREE.LineBasicMaterial({color:0x00ff00});
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
        this.laser=new THREE.Line(geo,mat);
        this.laser.scale.z=10;
        this.scene.add(this.laser);
    }

    setupController(){
        const controller = this.renderer.xr.getController(0);
        controller.addEventListener('selectstart',()=>this.teleport());
        this.scene.add(controller);
        controller.add(this.laser);
    }

    teleport(){
        const dir=new THREE.Vector3(0,0,-1).applyQuaternion(this.laser.quaternion);
        const origin=this.laser.getWorldPosition(new THREE.Vector3());
        this.raycaster.set(origin,dir);
        const intersects=this.raycaster.intersectObjects(this.scene.children,true);
        if(intersects.length>0){
            const point=intersects[0].point;
            this.camera.position.set(point.x,1.6,point.z);
        }
    }
}
