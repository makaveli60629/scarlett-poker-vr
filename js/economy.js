// economy.js - Scarlett VR Poker Economy, Inventory, Achievements

AFRAME.registerComponent('economy', {
  schema: {
    playerChips: {type: 'int', default: 50000},
    prestigeLevel: {type: 'int', default: 1},
    achievements: {type: 'array', default: []},
    inventory: {type: 'array', default: []},
    friends: {type: 'array', default: []},
    maxTipAmount: {type: 'int', default: 2000}
  },

  init: function() {
    this.wristCash = document.querySelector('#wrist-cash');
    this.updateHUD();
  },

  // ----- CHIP & BANK LOGIC -----
  addChips: function(amount){
    this.data.playerChips += amount;
    this.updateHUD();
  },

  removeChips: function(amount){
    if(amount>this.data.playerChips) amount=this.data.playerChips;
    this.data.playerChips -= amount;
    this.updateHUD();
  },

  tipFriend: function(friendName, amount){
    if(amount > this.data.maxTipAmount) amount=this.data.maxTipAmount;
    if(this.data.playerChips < amount) return false;
    if(!this.data.friends.includes(friendName)) return false;

    this.removeChips(amount);
    // Assuming server handles friend addition
    console.log(`Tipped ${amount} chips to ${friendName}`);
    return true;
  },

  updateHUD: function(){
    if(this.wristCash) this.wristCash.setAttribute('value', `BANK: $${this.data.playerChips}`);
  },

  // ----- ACHIEVEMENTS & PRESTIGE -----
  addAchievement: function(name){
    if(!this.data.achievements.includes(name)){
      this.data.achievements.push(name);
      console.log(`Achievement unlocked: ${name}`);
    }
  },

  levelUpPrestige: function(){
    this.data.prestigeLevel++;
    console.log(`Prestige Level Up! Now Level ${this.data.prestigeLevel}`);
  },

  // ----- INVENTORY -----
  addItem: function(item){
    this.data.inventory.push(item);
    console.log(`Added item to inventory: ${item.name}`);
  },

  removeItem: function(itemName){
    this.data.inventory = this.data.inventory.filter(i=>i.name !== itemName);
  },

  // ----- FRIENDS -----
  addFriend: function(name){
    if(!this.data.friends.includes(name)){
      this.data.friends.push(name);
      console.log(`Added friend: ${name}`);
    }
  },

  removeFriend: function(name){
    this.data.friends = this.data.friends.filter(f=>f!==name);
  },

  // ----- EVENT TICKETS -----
  addEventTicket: function(ticket){
    this.addItem({name: ticket, type:'ticket'});
    console.log(`Received event ticket: ${ticket}`);
  },

  useEventTicket: function(ticket){
    const index = this.data.inventory.findIndex(i=>i.name===ticket && i.type==='ticket');
    if(index>=0){
      this.data.inventory.splice(index,1);
      console.log(`Used event ticket: ${ticket}`);
      return true;
    }
    return false;
  },

  // ----- SAVE / LOAD (localStorage for now) -----
  saveData: function(){
    const saveObj = {
      chips: this.data.playerChips,
      prestige: this.data.prestigeLevel,
      achievements: this.data.achievements,
      inventory: this.data.inventory,
      friends: this.data.friends
    };
    localStorage.setItem('scarlettVRPlayer', JSON.stringify(saveObj));
    console.log('Player data saved.');
  },

  loadData: function(){
    const saved = localStorage.getItem('scarlettVRPlayer');
    if(saved){
      const obj = JSON.parse(saved);
      this.data.playerChips = obj.chips;
      this.data.prestigeLevel = obj.prestige;
      this.data.achievements = obj.achievements;
      this.data.inventory = obj.inventory;
      this.data.friends = obj.friends;
      this.updateHUD();
      console.log('Player data loaded.');
    }
  }
});
