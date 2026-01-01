AFRAME.registerComponent('mega-particles', {
    init: function () {
        // High-density 1.5.1 optimization
        this.el.setAttribute('particle-system', {
            preset: 'gold',
            particleCount: 4000,
            size: 0.2,
            maxAge: 3,
            velocityValue: '0 3 0'
        });
    }
});
