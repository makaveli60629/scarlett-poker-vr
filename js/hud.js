export const HUD = {
  init(ctx) {
    const h = document.getElementById('hud')
    h.addEventListener('dblclick', () => h.classList.toggle('hidden'))
  }
}
