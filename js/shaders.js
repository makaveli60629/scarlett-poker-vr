// Custom Shaders for Table and Environment Noise
export const TableShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float time;
        // Simple noise function for felt texture effect
        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        void main() {
            float n = noise(vUv * 100.0);
            gl_FragColor = vec4(0.0, 0.4 + (n * 0.1), 0.1, 1.0);
        }
    `
};
