/**
 * SCARLET VR POKER - UPDATE 1.8 MASTER ENGINE
 * Includes: Scorpion Room, Store, Daily Claims, Oculus Controls, & VR Notifications
 */

let scene, camera, renderer, clock;
let controller1, controller2, raycaster;
let notificationGroup, scarletLogo;
let playerMoney = 10000;
let isSeated = false;

const TEXTURE_PATH = 'assets/textures/';

// --- INITIALIZATION ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020202); 
    scene.fog = new THREE.FogExp2(0x020202, 0.05);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5); // Default standing height

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();

    setupLights();
    setupOculusControllers();
    
    // Create the Environments
    createScorpionRoom();
    createScarletStore();
    createNotificationSystem();

    // Start Animation
    renderer.setAnimationLoop(render);

    // Initial Notification: Daily Claim
    setTimeout(() => {
        triggerNotification("DAILY CLAIM", "You received $5,000 Luxury Bonus!", "CLAIM");
    }, 2000);
}

// --- LIGHTING SYSTEM ---
function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambient);

    const stingerLight = new THREE.PointLight(0xff4500, 2, 20); // Scorpion Orange
    stingerLight.position.set(0, 5, -5);
    scene.add(stingerLight);
}

// --- OCULUS CONTROLS & SEATING LOGIC ---
function setupOculusControllers() {
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelect);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelect);
    scene.add(controller2);

    // Laser Line for UI
    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-2)]);
    const line = new THREE.Line(lineGeom);
    controller1.add(line.clone());
    controller2.add(line.clone());
}

function onSelect(event) {
    const controller = event.target;
    const intersections = getIntersections(controller);

    if (intersections.length > 0) {
        const object = intersections[0].object;

        // Notification OK Button
        if (object.name === "ui_ok_btn") {
            dismissNotification();
            playerMoney += 5000;
        }

        // Seating Logic (Move to Play Game)
        if (object.name === "poker_table_felt" && !isSeated) {
            sitDownAtTable();
        }
    }
}

// --- THE SCORPION ROOM (Felt, Art, Sconces) ---
function createScorpionRoom() {
    const loader = new THREE.TextureLoader();

    // 1. Black Felt Table
    const tableGroup = new THREE.Group();
    const feltGeom = new THREE.CylinderGeometry(2, 2, 0.2, 64);
    const feltMat = new THREE.MeshStandardMaterial({ 
        color: 0x0a0a0a, 
        roughness: 0.9,
        map: loader.load(TEXTURE_PATH + 'black_felt_grain.jpg') // Texture update 1.4 placeholder
    });
    const felt = new THREE.Mesh(feltGeom, feltMat);
    felt.name = "poker_table_felt";
    felt.position.y = 1;
    tableGroup.add(felt);

    // 2. Dogs Playing Poker / Scorpion Art Frames
    const artGeom = new THREE.PlaneGeometry(2, 1.5);
    const artMat = new THREE.MeshStandardMaterial({ map: loader.load(TEXTURE_PATH + 'scorpion_art.jpg') });
    const frame = new THREE.Mesh(artGeom, artMat);
    frame.position.set(0, 3, -8);
    scene.add(frame);

    scene.add(tableGroup);
}

// --- SCARLET VR STORE & LOGO ---
function createScarletStore() {
    const loader = new THREE.TextureLoader();
    
    // Floating Logo
    const logoGeom = new THREE.PlaneGeometry(1, 1);
    const logoMat = new THREE.MeshBasicMaterial({ 
        map: loader.load(TEXTURE_PATH + 'scarlet_logo_png.png'),
        transparent: true,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    scarletLogo = new THREE.Mesh(logoGeom, logoMat);
    scarletLogo.position.set(-5, 2.5, -5);
    scarletLogo.name = "scarletLogo";
    scene.add(scarletLogo);
}

// --- VR NOTIFICATION SYSTEM ---
function createNotificationSystem() {
    notificationGroup = new THREE.Group();
    notificationGroup.visible = false;

    const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.9 })
    );

    const okBtn = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xffd700 })
    );
    okBtn.name = "ui_ok_btn";
    okBtn.position.set(0, -0.2, 0.02);

    notificationGroup.add(panel, okBtn);
    scene.add(notificationGroup);
}

function triggerNotification(title, msg, btnText) {
    notificationGroup.visible = true;
    notificationGroup.position.set(camera.position.x, camera.position.y, camera.position.z - 2);
    notificationGroup.lookAt(camera.position);
}

function dismissNotification() {
    notificationGroup.visible = false;
}

function sitDownAtTable() {
    isSeated = true;
    // Smoothly animate camera to table position
    camera.position.set(0, 1.2, -1.8);
    camera.lookAt(0, 1, 0);
    console.log("Player Seated. Dealing Cards...");
}

// --- CORE RENDER LOOP ---
function render() {
    const delta = clock.getDelta();

    // Rotate the Scarlet Logo
    if (scarletLogo) {
        scarletLogo.rotation.y += 0.01;
        scarletLogo.position.y += Math.sin(clock.elapsedTime) * 0.001; // Hover effect
    }

    renderer.render(scene, camera);
}

function getIntersections(controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    return raycaster.intersectObjects(scene.children, true);
}

init();
