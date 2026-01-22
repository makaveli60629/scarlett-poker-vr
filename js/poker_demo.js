// js/poker_demo.js
(function(){
  const D = window.SCARLETT_DIAG;
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const suits = ["♠","♥","♦","♣"];

  const state = { enabled: true, t: 0, idx: 0, timer: null };

  function pickCard(){
    const r = ranks[Math.floor(Math.random()*ranks.length)];
    const s = suits[Math.floor(Math.random()*suits.length)];
    return `${r}${s}`;
  }

  function setCardPlane(plane, text){
    // build a tiny canvas texture (no external assets)
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 356;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8fbff";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = "#0c1118";
    ctx.lineWidth = 10;
    ctx.strokeRect(10,10,canvas.width-20,canvas.height-20);

    ctx.fillStyle = "#0c1118";
    ctx.font = "bold 72px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(text, 28, 92);

    ctx.font = "bold 160px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text.slice(-1), canvas.width/2, 240);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.0 });
    const mesh = plane.getObject3D("mesh");
    if(mesh) {
      // plane primitive makes a mesh with material array sometimes
      mesh.material = mat;
      mesh.material.needsUpdate = true;
    }
    plane.setAttribute("material", "opacity: 1");
  }

  function updateCommunityCards(){
    const cc = Array.from(document.querySelectorAll(".communityCard"));
    if(!cc.length) return;
    // reveal progressively
    const reveal = (state.idx % 6); // 0..5
    for(let i=0;i<cc.length;i++){
      if(i < reveal){
        setCardPlane(cc[i], pickCard());
      } else {
        cc[i].setAttribute("material", "color: #ffffff; opacity: 0.12");
      }
    }
  }

  function updateBotActions(){
    const rings = Array.from(document.querySelectorAll(".actionRing"));
    const actions = ["CHECK","BET","FOLD","CALL","RAISE","WAIT"];
    for (let i=0;i<rings.length;i++){
      const a = actions[(state.idx + i) % actions.length];
      // encode action by emissive intensity (simple, stable)
      const intensity = (a==="BET"||a==="RAISE") ? 0.75 : (a==="FOLD") ? 0.15 : 0.35;
      rings[i].setAttribute("material", `color:#2b3b52; opacity:0.55; emissive:#4aa6ff; emissiveIntensity:${intensity}`);
      // floating action text near felt
      const bot = rings[i].closest(".bot");
      if(bot){
        let txt = bot.querySelector(".actionText");
        if(!txt){
          txt = document.createElement("a-text");
          txt.classList.add("actionText");
          txt.setAttribute("position","0 0.18 0.70");
          txt.setAttribute("rotation","-90 0 0");
          txt.setAttribute("align","center");
          txt.setAttribute("width","2.4");
          bot.appendChild(txt);
        }
        txt.setAttribute("value", a);
        txt.setAttribute("color", (a==="FOLD") ? "#a0a7b2" : "#d7e6ff");
      }
    }
  }

  function step(){
    if(!state.enabled) return;
    state.idx = (state.idx + 1) % 6;
    updateCommunityCards();
    updateBotActions();
  }

  function start(){
    if(state.timer) return;
    step();
    state.timer = setInterval(step, 1800);
    D.log("[pokerDemo] started ✅");
  }

  function stop(){
    if(!state.timer) return;
    clearInterval(state.timer);
    state.timer = null;
    D.log("[pokerDemo] stopped");
  }

  function setEnabled(v){
    state.enabled = !!v;
    if(state.enabled) start(); else stop();
  }

  // UI button hits on in-world jumbotron
  function wireJumbo(){
    const prev = document.getElementById("btnPrev");
    const next = document.getElementById("btnNext");
    const screen = document.getElementById("jumboScreen");
    if(!prev || !next || !screen) return;

    const channels = [
      { title: "Table Cam", color:"#0a0f18" },
      { title: "VIP Room", color:"#0b1623" },
      { title: "Store Preview", color:"#101a26" },
      { title: "Tourney Board", color:"#0e1420" },
    ];
    let c = 0;

    function apply(){
      const ch = channels[c];
      screen.setAttribute("material", `color:${ch.color}; emissive:${ch.color}; emissiveIntensity:0.35`);
      D.toast("Jumbotron: " + ch.title);
    }
    function hitPrev(){ c = (c - 1 + channels.length) % channels.length; apply(); }
    function hitNext(){ c = (c + 1) % channels.length; apply(); }

    prev.addEventListener("click", hitPrev);
    next.addEventListener("click", hitNext);

    // allow controller ray "click"
    prev.addEventListener("mousedown", hitPrev);
    next.addEventListener("mousedown", hitNext);

    apply();
    D.log("[jumbotron] buttons wired ✅");
  }

  wireJumbo();
  start();

  window.SCARLETT_POKER_DEMO = { setEnabled };
})();
