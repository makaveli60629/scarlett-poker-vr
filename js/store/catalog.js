export const StoreCatalog = {
  createDefault(){
    // NOTE: These are placeholder store items. You can swap modelUrl/thumb later.
    const items = [
      { id:'avatar_male_01', name:'Avatar — Male (Base)', type:'avatar', price:0, rarity:'common', thumb:'male' },
      { id:'avatar_female_01', name:'Avatar — Female (Base)', type:'avatar', price:0, rarity:'common', thumb:'female' },
      { id:'table_felt_cyan', name:'Table Felt — Cyan Pro', type:'cosmetic', price:250, rarity:'rare', thumb:'felt' },
      { id:'chips_neon', name:'Chip Set — Neon', type:'cosmetic', price:200, rarity:'rare', thumb:'chips' },
      { id:'prop_jumbotron_skin', name:'Jumbotron Skin — Noir', type:'prop', price:150, rarity:'uncommon', thumb:'screen' },
      { id:'fx_win_sparks', name:'Win FX — Sparks', type:'fx', price:300, rarity:'epic', thumb:'fx' },
    ];

    return { items };
  }
};
