const KEY = 'SCARLETT_PROFILE_v1_1';

export class PlayerProfile {
  constructor(data){
    this.coins = Number.isFinite(data?.coins) ? data.coins : 500;
    this.owned = Array.isArray(data?.owned) ? data.owned : ['avatar_male_01','avatar_female_01'];
    this.equipped = data?.equipped || { avatar:'avatar_male_01' };
  }

  owns(itemId){ return this.owned.includes(itemId); }

  grant(amount){
    this.coins = Math.max(0, Math.floor(this.coins + amount));
    this.save();
  }

  canAfford(price){ return this.coins >= price; }

  buy(item){
    if (this.owns(item.id)) return { ok:true, msg:'Already owned' };
    if (!this.canAfford(item.price)) return { ok:false, msg:'Not enough coins' };
    this.coins -= item.price;
    this.owned.push(item.id);
    this.save();
    return { ok:true, msg:'Purchased' };
  }

  equip(item){
    if (!this.owns(item.id)) return { ok:false, msg:'Not owned' };
    if (item.type === 'avatar') this.equipped.avatar = item.id;
    if (item.type === 'cosmetic') this.equipped.cosmetic = item.id;
    if (item.type === 'prop') this.equipped.prop = item.id;
    if (item.type === 'fx') this.equipped.fx = item.id;
    this.save();
    return { ok:true, msg:'Equipped' };
  }

  reset(){
    localStorage.removeItem(KEY);
    const fresh = PlayerProfile.loadOrCreate(true);
    this.coins = fresh.coins;
    this.owned = fresh.owned;
    this.equipped = fresh.equipped;
    this.save();
  }

  save(){
    localStorage.setItem(KEY, JSON.stringify({
      coins: this.coins,
      owned: this.owned,
      equipped: this.equipped
    }));
  }

  static loadOrCreate(forceFresh=false){
    if (!forceFresh){
      try{
        const raw = localStorage.getItem(KEY);
        if (raw){
          const data = JSON.parse(raw);
          return new PlayerProfile(data);
        }
      }catch(_){}
    }
    const p = new PlayerProfile({ coins: 500, owned: ['avatar_male_01','avatar_female_01'], equipped:{ avatar:'avatar_male_01' } });
    p.save();
    return p;
  }
}
