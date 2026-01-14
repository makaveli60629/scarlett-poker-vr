export const Diagnostics = {
  init(ctx) {
    this.ctx = ctx
    ctx.Diagnostics = this
    this.log('Diagnostics Online')
  },

  log(msg) {
    console.log('%c[DIAG]', 'color:#0f0', msg)
    this._hud(msg)
  },

  ok(msg) { this.log('✔ '+msg) },
  fail(sys, err) {
    console.error('[FAIL]', sys, err)
    this._hud('✖ '+sys)
  },

  report(mods) {
    Object.entries(mods).forEach(([k,v]) => v ? this.ok(k) : this.fail(k))
  },

  _hud(msg) {
    const h = document.getElementById('hud')
    const d = document.createElement('div')
    d.textContent = msg
    h.appendChild(d)
  }
}
