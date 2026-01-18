// /js/modules/poker_interaction.js
// Android-first poker interaction: UI buttons while seated + deal player cards visually.
// Quest-ready: later we replace UI with gesture/hand interactions.
export function installPokerInteraction({ THREE, scene, rig, camera, dwrite }, { tableCenter, tableY } = {}){
  const group = new THREE.Group();
  group.name = "pokerInteraction";
  scene.add(group);

  const ui = {
    wrap: document.createElement("div"),
    btnCheck: document.createElement("button"),
    btnBet: document.createElement("button"),
    btnFold: document.createElement("button"),
  };
    ui.wrap.style.display = "none";
  ui.wrap.style.position = "fixed";
  ui.wrap.style.left = "12px";
  ui.wrap.style.bottom = "12px";
  ui.wrap.style.zIndex = "30";
    ui.wrap.style.gap = "6px";
  ui.wrap.style.flexWrap = "wrap";
    ui.wrap.style.pointerEvents = "auto";
  ui.wrap.style.userSelect = "none";
              ui.wrap.style.display = "flex";
    // force flex when visible
                                  // Set once correctly
    ui.wrap.style.display = "flex";
    ui.wrap.style.alignItems = "center";

  ui.btnCheck.textContent = "Check/Call";
  ui.btnBet.textContent = "Bet +10";
  ui.btnFold.textContent = "Fold";

  for (const b of [ui.btnCheck, ui.btnBet, ui.btnFold]){
    b.style.padding = "12px 14px";
    b.style.border = "1px solid #333";
    b.style.borderRadius = "10px";
    b.style.background = "#fff";
    b.style.color = "#000";
    b.style.fontSize = "14px";
  }
  ui.wrap.appendChild(ui.btnCheck);
  ui.wrap.appendChild(ui.btnBet);
  ui.wrap.appendChild(ui.btnFold);
  document.body.appendChild(ui.wrap);

  let seated = false;
  let pot = 0;
  let playerCards = [];

  const cardW=0.18, cardH=0.26;
  const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness:0.85 });
  const cardBackMat = new THREE.MeshStandardMaterial({ color: 0x2233ff, roughness:0.75 });

  function clearCards(){
    for (const c of playerCards) group.remove(c);
    playerCards = [];
  }

  function dealPlayer(){
    clearCards();
    // Two cards slightly in front of camera (in rig space)
    const c1 = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), cardBackMat);
    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), cardBackMat);
    c1.rotation.x = -0.8;
    c2.rotation.x = -0.8;
    c1.position.set(-0.12, 1.10, -0.42);
    c2.position.set(0.12, 1.10, -0.42);
    // Attach to rig so it follows player
    rig.add(c1); rig.add(c2);
    playerCards.push(c1,c2);
    try{ window.__scarlettAudioCues?.card?.(); }catch(_){}
    dwrite?.("[poker] dealt player cards");
  }

  function showUI(v){
    ui.wrap.style.display = v ? "flex" : "none";
  }

  function onSeatedChange(v){
    seated = !!v;
    showUI(seated);
    if (seated){
      pot = 0;
      dealPlayer();
      dwrite?.("[poker] seated UI enabled");
    } else {
      showUI(false);
      clearCards();
    }
  }

  // Hook seat events from seat_system
  window.__scarlettOnSeatChange = window.__scarlettOnSeatChange || [];
  window.__scarlettOnSeatChange.push(onSeatedChange);

  ui.btnCheck.addEventListener("click", ()=>{
    if (!seated) return;
    dwrite?.("[poker] check/call");
    try{ window.__scarlettAudioCues?.chip?.(); }catch(_){}
  });
  ui.btnBet.addEventListener("click", ()=>{
    if (!seated) return;
    pot += 10;
    dwrite?.(`[poker] bet +10 (pot=${pot})`);
    try{ window.__scarlettAudioCues?.chip?.(); }catch(_){}
  });
  ui.btnFold.addEventListener("click", ()=>{
    if (!seated) return;
    dwrite?.("[poker] fold");
    onSeatedChange(false);
  });

  dwrite?.("[poker] interaction installed (Android UI; Quest-ready)");
  return { group, update(){} };
}
