// 1.5.1 Mega Particles Optimized
AFRAME.registerComponent('mega-particles', {
    init: function () {
        this.el.setAttribute('particle-system', {
            preset: 'gold',
            particleCount: 2000,
            size: 0.1,
            color: '#FFD700'
        });
    }
});
