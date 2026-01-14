import { World } from './world.js'
import { Diagnostics } from './diagnostics.js'
import { Input } from './input.js'
import { HUD } from './hud.js'

export const Core = {
  async start() {
    this.THREE = THREE
    this.modules = {}

    Diagnostics.init(this)
    HUD.init(this)

    try {
      this.world = await World.init(this)
      this.modules.world = true
    } catch (e) {
      Diagnostics.fail('World', e)
    }

    try {
      Input.init(this)
      this.modules.input = true
    } catch (e) {
      Diagnostics.fail('Input', e)
    }

    Diagnostics.report(this.modules)
  }
}
