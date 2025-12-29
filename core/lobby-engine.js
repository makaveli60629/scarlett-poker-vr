AFRAME.registerComponent('lobby-gate', {
  schema:{ requiredRank:{default:"BRONZE"} },
  init(){
    if(window.PLAYER_RANK !== this.data.requiredRank){
      this.el.setAttribute("visible",false);
    }
  }
});
