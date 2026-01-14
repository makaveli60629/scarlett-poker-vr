export const Input = {
    init(ctx) {
        const { renderer, scene } = ctx.world;
        
        // Setup Hand Tracking
        this.hand1 = renderer.xr.getHand(0);
        this.hand2 = renderer.xr.getHand(1);
        scene.add(this.hand1, this.hand2);
        
        // Add visual cues for hands (simple cubes for now)
        const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        this.hand1.add(new THREE.Mesh(geo, mat));
        this.hand2.add(new THREE.Mesh(geo, mat));
    }
};
