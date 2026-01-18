import { diagWrite } from "./diagnostics.js";
import { TABLE } from "./table.js";
import { WORLD } from "./world.js";

const RANKS=["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
const SUITS=["♠","♥","♦","♣"];

let deck=[], community=[], hands=[], street=0, cardEntities=[];

function buildDeck(){
  const d=[];
  for (const s of SUITS) for (const r of RANKS) d.push({r,s});
  for (let i=d.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [d[i],d[j]]=[d[j],d[i]];
  }
  return d;
}
const lab=(c)=>`${c.r}${c.s}`;

function clearCards(){ for (const e of cardEntities) e.remove(); cardEntities=[]; }

function addCard(pos, rot, label, color){
  const root=document.getElementById("worldRoot");
  const card=document.createElement("a-plane");
  card.setAttribute("width","0.32");
  card.setAttribute("height","0.46");
  card.setAttribute("position",pos);
  card.setAttribute("rotation",rot);
  card.setAttribute("material","color:#0f141c; roughness:1; metalness:0; side: double");
  const t=document.createElement("a-text");
  t.setAttribute("value",label);
  t.setAttribute("align","center");
  t.setAttribute("color",color||"#e8f3ff");
  t.setAttribute("width","3");
  t.setAttribute("position","0 0 0.01");
  card.appendChild(t);
  root.appendChild(card);
  cardEntities.push(card);
}

function seatPos(i){
  const a=(i/TABLE.seats)*Math.PI*2;
  return {a, x:Math.cos(a)*(TABLE.seatRadius-0.25), z:Math.sin(a)*(TABLE.seatRadius-0.25)};
}

function render(){
  clearCards();
  const y=WORLD.tableY+0.965;

  const startX=-0.7;
  for (let i=0;i<community.length;i++){
    addCard(`${startX+i*0.35} ${y} 0`, "-90 0 0", lab(community[i]));
  }

  for (let i=0;i<TABLE.seats;i++){
    const hp=hands[i]||[];
    const {a,x,z}=seatPos(i);
    const rotY=(-a*180/Math.PI)+90;

    const fx=x*0.72, fz=z*0.72;
    if (hp[0]) addCard(`${fx-0.10} ${y} ${fz}`, `-90 ${rotY} 0`, lab(hp[0]));
    if (hp[1]) addCard(`${fx+0.10} ${y} ${fz}`, `-90 ${rotY} 0`, lab(hp[1]));

    const hx=x*1.05, hz=z*1.05, hy=WORLD.tableY+1.55;
    const label=hp.length===2?`${lab(hp[0])}  ${lab(hp[1])}`:"— —";
    addCard(`${hx} ${hy} ${hz}`, `0 ${rotY} 0`, label, (i===5)?"#2bdcff":"#ffb3e6");
  }
}

export function initPokerDemoUI(){
  document.getElementById("btnDeal")?.addEventListener("click", dealNewHand);
  document.getElementById("btnNext")?.addEventListener("click", nextStreet);
  document.getElementById("btnReset")?.addEventListener("click", reset);
  reset();
}

export function reset(){
  deck=buildDeck(); community=[]; hands=Array.from({length:TABLE.seats}, ()=>[]); street=0;
  render(); diagWrite("[poker] reset ✅");
}

export function dealNewHand(){
  if (deck.length<20) deck=buildDeck();
  community=[]; hands=Array.from({length:TABLE.seats}, ()=>[]); street=0;
  for (let r=0;r<2;r++) for (let i=0;i<TABLE.seats;i++) hands[i].push(deck.pop());
  render(); diagWrite("[poker] dealt ✅");
}

export function nextStreet(){
  if ((hands[0]||[]).length!==2){ diagWrite("[poker] deal first"); return; }
  if (street===0){ community=[deck.pop(),deck.pop(),deck.pop()]; street=1; }
  else if (street===1){ community.push(deck.pop()); street=2; }
  else if (street===2){ community.push(deck.pop()); street=3; }
  else { diagWrite("[poker] complete (reset/deal)"); }
  render(); diagWrite(`[poker] street=${street} community=${community.length}`);
}
