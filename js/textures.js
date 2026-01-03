import * as THREE from 'three';

export const TextureStore = {
    loader: new THREE.TextureLoader(),
    paths: {
        tableFelt: 'assets/textures/felt.jpg',
        cardBack: 'assets/textures/card_back.jpg'
    },
    
    apply(mesh, type) {
        this.loader.load(this.paths[type], (tex) => {
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
        });
    }
};
