// event-room.js
// Handles tournaments, events, ticket system, and notifications

import { addItemToInventory, removeItemFromInventory } from './economy.js';

// Sample events
const dailyEvent = {
  name: "Daily Free-for-All",
  startTime: "17:00", // 5 PM daily
  duration: 3600, // seconds
  prizeChips: 5000
};

const cashAppEvent = {
  name: "Cash App Tournament",
  ticketId: "cashapp-ticket",
  prizeAmount: 100, // USD
  entryPrice: 5, // free tickets for entry
  active: false
};

// Render event room HUD
export function renderEventRoom() {
  const eventContainer = document.getElementById('event-room');
  eventContainer.innerHTML = '';

  const events = [dailyEvent, cashAppEvent];
  events.forEach((evt, i) => {
    const evtBox = document.createElement('a-box');
    evtBox.setAttribute('position', `0 ${-i*0.6} 0`);
    evtBox.setAttribute('width', '1.2');
    evtBox.setAttribute('height', '0.5');
    evtBox.setAttribute('depth', '0.2');
    evtBox.setAttribute('color', '#FF6347'); // tomato for visibility
    evtBox.setAttribute('class', 'clickable');

    const label = document.createElement('a-text');
    label.setAttribute('value', `${evt.name}\nStarts at: ${evt.startTime}`);
    label.setAttribute('align', 'center');
    label.setAttribute('color', '#fff');
    label.setAttribute('position', '0 0 0.11');
    label.setAttribute('width', '2');
    evtBox.appendChild(label);

    evtBox.addEventListener('click', () => {
      if (evt.ticketId) {
        // Cash App Event: check ticket
        if (window.playerData.inventory.some(item => item.id === evt.ticketId)) {
          removeItemFromInventory(evt.ticketId);
          evt.active = true;
          alert(`Entered ${evt.name}!`);
        } else {
          alert(`You need a ticket to enter this event!`);
        }
      } else {
        // Daily event: just join
        alert(`Entered ${evt.name}! Good luck!`);
      }
    });

    eventContainer.appendChild(evtBox);
  });
}

// Timer / notification system
export function checkEventStart() {
  const now = new Date();
  const currentTime = now.getHours() + ':' + now.getMinutes();
  const dailyStart = dailyEvent.startTime;

  if (currentTime === dailyStart) {
    // Flash notification
    showNotification(`${dailyEvent.name} has started! Press OK to join.`);
  }
}

// Notification logic
export function showNotification(msg) {
  const notif = document.getElementById('notification');
  notif.innerHTML = msg + "\n[OK]";
  notif.setAttribute('visible', 'true');
  notif.addEventListener('click', () => {
    notif.setAttribute('visible', 'false');
  });
}

// Call checkEventStart every minute
setInterval(checkEventStart, 60000);
