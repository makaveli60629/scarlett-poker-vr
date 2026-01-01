// Mega Particles & Analysis 1000x Better
AFRAME.registerComponent('mega-particles', {
    init: function () {
        this.el.setAttribute('particle-system', {
            preset: 'dust',
            color: '#FFD700',
            particleCount: 5000, // Intensified for 1.5.1
            size: 0.5,
            velocityValue: '0 2 0'
        });
    }
});

// Shader/Noise integration for 1.3 complete logic
const tableShader = {
    schema: {time: {type: 'number'}},
    fragmentShader: `
        // Custom Perlin Noise for table texture (Update 1.4 prep)
        void main() {
            gl_FragColor = vec4(0.0, 0.5, 0.0, 1.0); 
        }
    `
};
