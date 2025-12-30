// wrist-hud.js
// Handles VR wrist menu, notifications, and quick access panels

import { renderStore, renderInventory } from './store.js';
import { renderEventRoom } from './event-room.js';

// Wrist HUD main container
const wristHUD = document.getElementById('wrist-hud');
wristHUD.setAttribute('visible', 'false'); // hidden by default

// Toggle HUD visibility
export function toggleWristHUD() {
  const visible = wristHUD.getAttribute('visible');
  wristHUD.setAttribute('visible', !visible);
}

// Create buttons on wrist HUD
export function initWristHUD() {
  const buttons = [
    { id: 'btn-inventory', label: 'Inventory', action: () => renderInventory(window.playerData.inventory) },
    { id: 'btn-store', label: 'Store', action: renderStore },
    { id: 'btn-events', label: 'Events', action: renderEventRoom },
    { id: 'btn-achievements', label: 'Achievements', action: showAchievements }
  ];

  buttons.forEach((btn, i) => {
    const btnBox = document.createElement('a-box');
    btnBox.setAttribute('position', `0 ${-i*0.4} 0`);
    btnBox.setAttribute('width', '0.5');
    btnBox.setAttribute('height', '0.2');
    btnBox.setAttribute('depth', '0.1');
    btnBox.setAttribute('color', '#FFD700');
    btnBox.setAttribute('class', 'clickable');
    btnBox.setAttribute('id', btn.id);

    const label = document.createElement('a-text');
    label.setAttribute('value', btn.label);
    label.setAttribute('align', 'center');
    label.setAttribute('color', '#000');
    label.setAttribute('position', '0 0 0.06');
    label.setAttribute('width', '1.5');
    btnBox.appendChild(label);

    btnBox.addEventListener('click', btn.action);
    wristHUD.appendChild(btnBox);
  });
}

// Notification system
const notificationPanel = document.getElementById('wrist-notification');
notificationPanel.setAttribute('visible', 'false');

export function showNotification(msg) {
  notificationPanel.innerHTML = msg + "\n[OK]";
  notificationPanel.setAttribute('visible', 'true');

  notificationPanel.addEventListener('click', () => {
    notificationPanel.setAttribute('visible', 'false');
  });
}

// Example Achievements panel
function showAchievements() {
  const achievementsPanel = document.getElementById('achievements-panel');
  achievementsPanel.innerHTML = '';
  window.playerData.achievements.forEach((ach, i) => {
    const achText = document.createElement('a-text');
    achText.setAttribute('value', `🏆 ${ach.name}: ${ach.status}`);
    achText.setAttribute('align', 'left');
    achText.setAttribute('color', '#FFF');
    achText.setAttribute('position', `0 ${-i*0.25} 0`);
    achievementsPanel.appendChild(achText);
  });
  achievementsPanel.setAttribute('visible', 'true');
}

// Initialize wrist HUD when scene loads
document.addEventListener('DOMContentLoaded', initWristHUD);
