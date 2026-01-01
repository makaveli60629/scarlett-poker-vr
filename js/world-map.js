import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export const scene = new THREE.Scene();
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

export const colliders = [];
const brickMat = new THREE.MeshStandardMaterial({ color: 0x8b2222 });

function buildRoom(x, z, size, color) {
    const group = new THREE.Group();
    // 4m Heights
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: 0x111111}));
    floor.rotation.x = -Math.PI/2;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: 0x050505}));
    ceil.position.y = 4;
    ceil.rotation.x = Math.PI/2;
    group.add(floor, ceil);

    const wall = new THREE.Mesh(new THREE.BoxGeometry(size, 4, 0.5), brickMat);
    wall.position.set(0, 2, -size/2);
    group.add(wall);
    colliders.push(new THREE.Box3().setFromObject(wall));

    const light = new THREE.PointLight(color, 2, 20);
    light.position.set(0, 3.8, 0);
    group.add(light);

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

export const lobby = buildRoom(0, 0, 20, 0x00f2ff); // Blue Lobby
export const store = buildRoom(-25, 0, 15, 0xff00ff); // Purple Store
export const pokerRoom = buildRoom(25, 0, 15, 0x00ff00); // Green Poker
