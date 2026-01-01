AFRAME.registerComponent('mega-particles', {
    init: function () {
        this.el.setAttribute('particle-system', {
            preset: 'gold',
            particleCount: 2000,
            size: 0.1,
            opacity: 0.7,
            color: '#FFD700'
        });
    }
});
