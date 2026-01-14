import { SpawnPoints } from './spawn_points.js';
import { Tables } from './tables.js';

export const World = {
    async init(ctx) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
        this.scene.add(light);

        Tables.build(this.scene);
        SpawnPoints.apply(this.camera);

        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, this.camera);
        });
    }
};
