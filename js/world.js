import { SpawnPoints } from './spawn_points.js';
import { Tables } from './tables.js';

export const World = {
    async init(ctx) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050505);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);
        document.body.appendChild(VRButton.createButton(renderer));

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        const point = new THREE.PointLight(0xffffff, 1);
        point.position.set(5, 5, 5);
        scene.add(ambient, point);

        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // Build Table
        Tables.build(scene);
        
        // Spawn Player
        SpawnPoints.apply(camera);

        renderer.setAnimationLoop(() => {
            renderer.render(scene, camera);
        });

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        return { scene, camera, renderer };
    }
};
