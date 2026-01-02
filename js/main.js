import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// --- PROJECT GLOBALS ---
let scene, camera, renderer, controller1, controller2;
const TEXTURE_PATH = 'assets/textures/';

// List of your texture files - fallback to grey if loading fails
const textureFiles = [
    'floor.jpg', 'wall.jpg', 'ceiling.jpg', 'trim.jpg', 
    'table_felt.jpg', 'phone_tex.jpg', 'menu_bg.jpg'
];

const textures = {};

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // 1. RENDERER & VR SETUP
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // 2. CAMERA
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 3); // Sitting height

    // 3. LIGHTING
    const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 2.0);
    scene.add(ambient);
    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    // 4. LOAD TEXTURES & BUILD WORLD
    loadTextures();
    buildRoom();
    createStoreAndPhone();
    setupOculusControls();

    renderer.setAnimationLoop(render);
}

function loadTextures() {
    const loader = new THREE.TextureLoader();
    textureFiles.forEach(file => {
        textures[file] = loader.load(
            `${TEXTURE_PATH}${file}`,
            undefined, 
            undefined, 
            () => { console.warn(`Texture ${file} missing, using grey.`); }
        );
    });
}

function getMaterial(fileName, defaultColor = 0x808080) {
    // If texture fails/missing, THREE handles it, but we can force grey logic here
    return new THREE.MeshStandardMaterial({
        map: textures[fileName] || null,
        color: textures[fileName] ? 0xffffff : defaultColor
    });
}

function buildRoom() {
    // FLOOR
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floor = new THREE.Mesh(floorGeo, getMaterial('floor.jpg', 0x333333));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // CEILING
    const ceil = new THREE.Mesh(floorGeo, getMaterial('ceiling.jpg', 0x222222));
    ceil.position.y = 4;
    ceil.rotation.x = Math.PI / 2;
    scene.add(ceil);

    // WALLS (Back Wall)
    const wallGeo = new THREE.BoxGeometry(10, 4, 0.2);
    const backWall = new THREE.Mesh(wallGeo, getMaterial('wall.jpg', 0x444444));
    backWall.position.set(0, 2, -5);
    scene.add(backWall);

    // TRIM (Baseboard & Ceiling Trim)
    const trimGeo = new THREE.BoxGeometry(10, 0.2, 0.25);
    const baseTrim = new THREE.Mesh(trimGeo, getMaterial('trim.jpg', 0x111111));
    baseTrim.position.set(0, 0.1, -4.9);
    scene.add(baseTrim);

    const crownTrim = new THREE.Mesh(trimGeo, getMaterial('trim.jpg', 0x111111));
    crownTrim.position.set(0, 3.9, -4.9);
    scene.add(crownTrim);
}

function createStoreAndPhone() {
    // Store Menu (Floating)
    const menuGeo = new THREE.PlaneGeometry(1.2, 0.8);
    const menu = new THREE.Mesh(menuGeo, getMaterial('menu_bg.jpg', 0x0000ff));
    menu.position.set(-1.5, 1.5, -2);
    scene.add(menu);

    // Telephone
    const phoneGeo = new THREE.BoxGeometry(0.3, 0.2, 0.3);
    const phone = new THREE.Mesh(phoneGeo, getMaterial('phone_tex.jpg', 0x111111));
    phone.position.set(1.5, 0.75, -2);
    scene.add(phone);
}

function setupOculusControls() {
    const factory = new XRControllerModelFactory();
    
    // Controller 1
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', () => {
        // Logic: If user clicks "Play", they sit down
        camera.position.set(0, 1.2, 0); 
    });
    scene.add(controller1);
    
    const grip1 = renderer.xr.getControllerGrip(0);
    grip1.add(factory.createControllerModel(grip1));
    scene.add(grip1);

    // Controller 2
    controller2 = renderer.xr.getController(1);
    scene.add(controller2);
    
    const grip2 = renderer.xr.getControllerGrip(1);
    grip2.add(factory.createControllerModel(grip2));
    scene.add(grip2);
}

function render() {
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
