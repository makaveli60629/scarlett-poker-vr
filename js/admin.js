export const Admin = {
    init(ctx) {
        this.ctx = ctx;
        window.scarlettAdmin = {
            resetWorld: () => location.reload(),
            giveMoney: (amt) => ctx.Diagnostics.log(`Admin: Added ${amt} credits`),
            debugMode: () => {
                ctx.world.scene.traverse(obj => {
                    if (obj.isMesh) obj.material.wireframe = !obj.material.wireframe;
                });
            }
        };
        ctx.Diagnostics.ok('Admin Controls Active (window.scarlettAdmin)');
    }
};
