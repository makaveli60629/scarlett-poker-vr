// Coliseum A-Frame World Demo (V5)
// Hands-first UX + Private gate + Demo bots playing

const StorageKeys = {
  accepted: "coliseum.accepted.v1",
  member: "coliseum.member.v1"
};

// Change these for your club build
const MEMBER_CODE = "1234";          // invite code (rotate)
const ADMIN_BYPASS = "57130420";     // testing only (rotate / move server-side later)

const $ = (id) => document.getElementById(id);

const bus = {
  l: {},
  on(e,f){(this.l[e]=this.l[e]||[]).push(f)},
  emit(e,d){(this.l[e]||[]).forEach(fn=>fn(d))}
};

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function initWatch(){
  const root = $("watch-root");
  root.innerHTML = `
    <div class="hologram" style="padding:10px;display:flex;gap:8px;border-radius:14px">
      <button class="btn ok" id="wPlay" title="Play">🎮</button>
      <button class="btn ok" id="wFriends" title="Friends">👥</button>
      <button class="btn ok" id="wSports" title="Sports">🏆</button>
      <button class="btn ok" id="wGear" title="Gear">👕</button>
    </div>
  `;
  $("wPlay").onclick = () => {
    // Quick Play: move player near demo table
    const rig = $("rig");
    rig.setAttribute("position", "0 1.6 -8");
  };
  $("wSports").onclick = () => {
    // Focus Mode placeholder: just flashes ticker
    const t = $("live-ticker");
    t.style.boxShadow = "0 0 18px rgba(0,255,204,.75)";
    setTimeout(()=>t.style.boxShadow="", 900);
  };
}

function initLiveTicker(){
  const t = $("live-ticker");
  t.textContent = "UFC 324 (Jan 24): Gaethje vs Pimblett • NFL (Jan 25): Patriots @ Broncos | Rams @ Seahawks";
  // demo refresh
  setInterval(()=>{
    t.textContent = "LIVE FEED • " + new Date().toLocaleTimeString() + " • " +
      "UFC 324 (Jan 24) • NFL (Jan 25)";
    // Update jumbotron too
    $("jumbotronText").setAttribute("value", "JUMBOTRON\n" + t.textContent);
  }, 60000);
}

function initGoldenTicket(){
  const t = $("golden-ticket");
  // demo: seat ready after 20 seconds
  setTimeout(()=> bus.emit("SEAT_READY"), 20000);

  bus.on("SEAT_READY", ()=>{
    show(t);
    t.onclick = ()=>{
      hide(t);
      // auto-warp to open seat
      $("rig").setAttribute("position", "2 1.6 -12");
    };
  });
}

function initComplianceAndGate(){
  const compliance = $("compliance-overlay");
  const gate = $("gate-overlay");

  const accepted = localStorage.getItem(StorageKeys.accepted) === "1";
  if(!accepted){
    show(compliance);
  }

  $("btnDecline").onclick = ()=>{
    compliance.querySelector(".panel").innerHTML =
      "<h2>Access Declined</h2><p>You can return when you are ready.</p>";
  };

  $("btnAccept").onclick = ()=>{
    localStorage.setItem(StorageKeys.accepted, "1");
    hide(compliance);
    bus.emit("COMPLIANCE_ACCEPTED");
  };

  function showGate(){
    const hasMember = localStorage.getItem(StorageKeys.member) === "1";
    if(hasMember){
      bus.emit("GATE_PASSED", {admin:false});
      return;
    }
    show(gate);
    $("memberCode").focus();
  }

  if(accepted) showGate();
  bus.on("COMPLIANCE_ACCEPTED", showGate);

  function attempt(){
    const code = ($("memberCode").value || "").trim();
    if(!code) return;
    if(code === ADMIN_BYPASS){
      localStorage.setItem(StorageKeys.member, "1");
      hide(gate);
      bus.emit("GATE_PASSED", {admin:true});
      return;
    }
    if(code === MEMBER_CODE){
      localStorage.setItem(StorageKeys.member, "1");
      hide(gate);
      bus.emit("GATE_PASSED", {admin:false});
      return;
    }
    $("memberCode").value = "";
    $("memberCode").placeholder = "Invalid code — try again";
  }

  $("btnEnter").onclick = attempt;
  $("memberCode").addEventListener("keydown", (e)=>{ if(e.key==="Enter") attempt(); });
}

function openArena(){
  // Hide antechamber + reveal arena
  $("antechamber").setAttribute("visible", "false");
  $("arena").setAttribute("visible", "true");

  // Move rig into lobby facing table pod
  $("rig").setAttribute("position", "0 1.6 8");
  $("rig").setAttribute("rotation", "0 180 0");

  // Show HUD
  show($("watch-root"));
  show($("live-ticker"));
  show($("joystickZone"));
}

function initMobileJoystick(){
  const zone = $("joystickZone");
  const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  if(!isTouch){ hide(zone); return; }

  // NippleJS
  const manager = nipplejs.create({
    zone: zone,
    mode: "static",
    position: { left: "70px", bottom: "70px" },
    color: "white",
    size: 120
  });

  const rig = $("rig");
  let vx = 0, vz = 0;

  manager.on("move", (evt, data)=>{
    if(!data) return;
    const rad = data.angle?.radian ?? 0;
    const force = Math.min(data.force || 0, 1.2);
    // forward is -Z in A-Frame
    vz = -Math.cos(rad) * force * 0.07;
    vx =  Math.sin(rad) * force * 0.07;
  });

  manager.on("end", ()=>{ vx = 0; vz = 0; });

  // apply movement each frame
  $("scene").addEventListener("loaded", ()=>{
    const step = ()=>{
      const p = rig.getAttribute("position");
      rig.setAttribute("position", { x: p.x + vx, y: p.y, z: p.z + vz });
      requestAnimationFrame(step);
    };
    step();
  });
}

function spawnBots(){
  const botsRoot = $("bots");
  // 6 bots around table
  const radius = 3.6;
  for(let i=0;i<6;i++){
    const ang = (Math.PI*2)*(i/6);
    const x = Math.cos(ang)*radius;
    const z = Math.sin(ang)*radius;
    const bot = document.createElement("a-entity");
    bot.setAttribute("id", "bot"+i);
    bot.setAttribute("position", `${x} 0 ${z}`);
    bot.setAttribute("rotation", `0 ${(-ang*180/Math.PI)+90} 0`);
    // body
    const body = document.createElement("a-cylinder");
    body.setAttribute("radius", "0.35");
    body.setAttribute("height", "1.3");
    body.setAttribute("position", "0 0.65 0");
    body.setAttribute("material", `color: ${["#ff4d4d","#ffd24d","#4dff8a","#4dd7ff","#b24dff","#ff4dd2"][i]}; opacity:0.9`);
    bot.appendChild(body);
    // name
    const name = document.createElement("a-text");
    name.setAttribute("value", `BOT_${i+1}`);
    name.setAttribute("align", "center");
    name.setAttribute("color", "#00ffcc");
    name.setAttribute("position", "0 1.55 0");
    name.setAttribute("width", "4");
    bot.appendChild(name);

    botsRoot.appendChild(bot);
  }
}

function startDemoPokerLoop(){
  const community = $("communityText");
  const pot = $("potText");

  const deck = "A K Q J T 9 8 7 6 5 4 3 2".split(" ").flatMap(r=>["♠","♥","♦","♣"].map(s=>r+s));

  function draw(n){
    const d = deck.slice();
    const out = [];
    for(let i=0;i<n;i++){
      const idx = Math.floor(Math.random()*d.length);
      out.push(d.splice(idx,1)[0]);
    }
    return out;
  }

  let hand = 0;
  function nextHand(){
    hand++;
    const board = ["--","--","--","--","--"];
    let potVal = 0;
    community.setAttribute("value", "COMMUNITY: " + board.join(" "));
    pot.setAttribute("value", "POT: 0");

    // fake betting + reveal
    const run = () => {
      const cards = draw(5);
      // flop
      board[0]=cards[0]; board[1]=cards[1]; board[2]=cards[2];
      potVal += 1200;
      community.setAttribute("value", "COMMUNITY: " + board.join(" "));
      pot.setAttribute("value", "POT: " + potVal);

      // turn
      setTimeout(()=>{
        board[3]=cards[3];
        potVal += 1800;
        community.setAttribute("value", "COMMUNITY: " + board.join(" "));
        pot.setAttribute("value", "POT: " + potVal);
      }, 2500);

      // river
      setTimeout(()=>{
        board[4]=cards[4];
        potVal += 2400;
        community.setAttribute("value", "COMMUNITY: " + board.join(" "));
        pot.setAttribute("value", "POT: " + potVal);

        // winner
        setTimeout(()=>{
          const winner = "BOT_" + (1 + Math.floor(Math.random()*6));
          $("jumbotronText").setAttribute("value", `JUMBOTRON\nHand #${hand} Winner: ${winner}`);
          // next hand
          setTimeout(nextHand, 3500);
        }, 2200);

      }, 5200);
    };

    // small delay then run
    setTimeout(run, 1500);
  }

  nextHand();
}

window.addEventListener("DOMContentLoaded", ()=>{
  // Keep scene loaded for A-Frame; hide arena until gate passed
  initComplianceAndGate();
  initWatch();
  initLiveTicker();
  initGoldenTicket();
  initMobileJoystick();

  bus.on("GATE_PASSED", ({admin})=>{
    openArena();
    spawnBots();
    startDemoPokerLoop();
    if(admin){
      $("jumbotronText").setAttribute("value", "JUMBOTRON\n🥷 Admin unlocked");
    }
  });

  // If user already accepted + has member, auto-pass
  const accepted = localStorage.getItem(StorageKeys.accepted) === "1";
  const member = localStorage.getItem(StorageKeys.member) === "1";
  if(accepted && member){
    bus.emit("GATE_PASSED", {admin:false});
  }
});
