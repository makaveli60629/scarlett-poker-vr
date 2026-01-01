// Placeholder for noise/mesh shaders to be refined in 1.4
AFRAME.registerShader('poker-glow', {
  schema: {
    color: {type: 'color', is: 'uniform', default: 'red'}
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform vec3 color;
    void main() {
      gl_FragColor = vec4(color, 1.0);
    }
  `
});
