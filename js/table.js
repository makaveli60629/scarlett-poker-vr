export const Tables = {
  build(scene) {
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5,1.5,0.2,32),
      new THREE.MeshStandardMaterial({ color: 0x006600 })
    )
    table.position.y = 0.75
    scene.add(table)
  }
}
