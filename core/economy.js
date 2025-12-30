// core/economy.js

AFRAME.registerComponent('economy', {
  schema: {},

  init: function () {
    // Player data
    this.player = {
      chips: 1000,
      tickets: 0,
      inventory: [],
    };

    // AI placeholder chips
    this.ais = [
      {chips: 1000},
      {chips: 1000},
      {chips: 1000},
      {chips: 1000},
      {chips: 1000}
    ];

    // Event timers
    this.dailyEventTime = '17:00'; // 5 PM daily
    this.checkDailyEvent();

    // Display UI
    this.updateWristUI();
  },

  addChips: function (amount) {
    this.player.chips += amount;
    this.updateWristUI();
  },

  spendChips: function (amount) {
    if (this.player.chips >= amount) {
      this.player.chips -= amount;
      this.updateWristUI();
      return true;
    }
    return false;
  },

  tipChips: function (amount, target) {
    // Tip logic: max tip = 2000
    if (amount > 2000) amount = 2000;
    if (this.player.chips >= amount) {
      this.player.chips -= amount;
      target.chips += amount;
      this.updateWristUI();
      return true;
    }
    return false;
  },

  earnTicket: function () {
    this.player.tickets += 1;
    this.updateWristUI();
  },

  useTicket: function () {
    if (this.player.tickets > 0) {
      this.player.tickets -= 1;
      this.updateWristUI();
      return true;
    }
    return false;
  },

  checkDailyEvent: function () {
    const now = new Date();
    const [hour, minute] = this.dailyEventTime.split(':').map(Number);
    const eventToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);

    if (now >= eventToday) {
      this.notifyDailyEvent();
    } else {
      // Schedule for later
      const msUntilEvent = eventToday - now;
      setTimeout(() => { this.notifyDailyEvent(); }, msUntilEvent);
    }
  },

  notifyDailyEvent: function () {
    // Notify player: daily free for all event
    alert('Daily Free-for-All Poker Tournament is starting! Win a Cash App ticket!');
    // Give free ticket for entry
    this.earnTicket();
  },

  updateWristUI: function () {
    const chipEl = document.querySelector('#wristChips');
    const ticketEl = document.querySelector('#wristTickets');

    if (chipEl) chipEl.setAttribute('text', `value: Chips: ${this.player.chips}`);
    if (ticketEl) ticketEl.setAttribute('text', `value: Tickets: ${this.player.tickets}`);
  },

  depositPot: function (amount) {
    if (this.player.chips >= amount) {
      this.player.chips -= amount;
      const pot = document.querySelector('#pot');
      if (pot && pot.components['table-game']) {
        pot.components['table-game'].updatePotDisplay();
      }
      this.updateWristUI();
      return true;
    }
    return false;
  },

  payoutPot: function (amount) {
    this.player.chips += amount;
    this.updateWristUI();
  }
});

// Attach component to scene
document.querySelector('a-scene').setAttribute('economy', '');
