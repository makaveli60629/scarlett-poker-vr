import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.textureLoader = new THREE.TextureLoader();
        this.assetsPath = 'assets/textures/';
        
        this.initLights();
        this.createTable();
        this.createRoom();
    }

    initLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        const tableLight = new THREE.SpotLight(0xffffff, 1.5);
        tableLight.position.set(0, 4, 0);
        tableLight.angle = Math.PI / 4;
        tableLight.penumbra = 0.3;
        tableLight.castShadow = true;
        this.scene.add(tableLight);
    }

    createTable() {
        // Table Top with custom noise shader for felt texture
        const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 64);
        const tableMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(0x1a4a32) }, // Dark Casino Green
                uTime: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform vec3 uColor;
                float random (vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }
                void main() {
                    float noise = random(vUv * 500.0);
                    vec3 finalColor = uColor - (noise * 0.08);
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });

        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.y = 0.9;
        table.receiveShadow = true;
        this.scene.add(table);
    }

    createRoom() {
        // Floor using local texture assets
        const floorGeo = new THREE.PlaneGeometry(10, 10);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.8 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);
    }
}
