import { SpawnPoints } from './spawn_points.js'
import { Tables } from './tables.js'

export const World = {
  async init(ctx) {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x101010)

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 100)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    document.body.appendChild(renderer.domElement)
    document.body.appendChild(VRButton.createButton(renderer))

    const light = new THREE.HemisphereLight(0xffffff, 0x444444)
    scene.add(light)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50,50),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    )
    floor.rotation.x = -Math.PI/2
    scene.add(floor)

    SpawnPoints.apply(camera)
    Tables.build(scene)

    renderer.setAnimationLoop(() => renderer.render(scene, camera))

    return { scene, camera, renderer }
  }
}
