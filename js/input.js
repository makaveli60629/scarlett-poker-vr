export const Input = {
    init(ctx) {
        const { scene, renderer } = ctx.world;
        
        // Initialize VR Hands (Hand Tracking)
        this.hand1 = renderer.xr.getHand(0);
        this.hand2 = renderer.xr.getHand(1);
        
        scene.add(this.hand1);
        scene.add(this.hand2);

        // Standard Interaction Listeners
        window.addEventListener('mousedown', () => ctx.Diagnostics.log('Mouse Event Detected'));
        window.addEventListener('touchstart', () => ctx.Diagnostics.log('Touch Event Detected'));
        
        ctx.Diagnostics.ok('Hand Tracking Ready');
    }
};
