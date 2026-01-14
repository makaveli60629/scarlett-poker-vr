import { Core } from './core.js'

window.addEventListener('DOMContentLoaded', async () => {
  console.clear()
  console.log('[BOOT] Scarlett Poker VR Starting')
  await Core.start()
})
