export const Input = {
  init(ctx) {
    this.controllers = []

    if (ctx.world.renderer.xr.enabled) {
      for (let i=0;i<2;i++) {
        const c = ctx.world.renderer.xr.getController(i)
        c.addEventListener('connected', () => ctx.Diagnostics.ok('Controller '+i))
        ctx.world.scene.add(c)
        this.controllers.push(c)
      }
    }

    window.addEventListener('touchstart', () => ctx.Diagnostics.ok('Touch Input'))
    window.addEventListener('mousedown', () => ctx.Diagnostics.ok('Mouse Input'))
  }
}
