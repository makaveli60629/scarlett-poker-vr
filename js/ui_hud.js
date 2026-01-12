// /js/ui_hud.js — Scarlett HUD v1 (money/rank/time) with framed border
export const UIHud = (() => {
  let el = null;
  const state = { money: 100000, rank: "VIP", pot: 0 };

  function init() {
    el = document.createElement("div");
    el.id = "scarlett-hud";
    el.innerHTML = `
      <div class="hud-frame">
        <div class="hud-row">
          <div class="hud-chip"><span class="k">CHIPS</span><span class="v" id="hud-money">$100,000</span></div>
          <div class="hud-chip"><span class="k">RANK</span><span class="v" id="hud-rank">VIP</span></div>
          <div class="hud-chip"><span class="k">TIME</span><span class="v" id="hud-time">--:--:--</span></div>
          <div class="hud-chip"><span class="k">POT</span><span class="v" id="hud-pot">$0</span></div>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    const css = document.createElement("style");
    css.textContent = `
      #scarlett-hud{
        position:fixed; left:0; right:0; bottom:10px;
        display:flex; justify-content:center;
        pointer-events:none; z-index:9999;
        font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
      }
      .hud-frame{
        background:rgba(10,12,22,.52);
        border:1px solid rgba(127,231,255,.35);
        box-shadow:0 12px 40px rgba(0,0,0,.55);
        border-radius:18px;
        padding:10px 12px;
        backdrop-filter: blur(6px);
      }
      .hud-row{ display:flex; gap:10px; align-items:center; }
      .hud-chip{
        min-width:120px;
        padding:10px 12px;
        border-radius:14px;
        border:1px solid rgba(255,45,122,.18);
        background:rgba(8,10,18,.55);
      }
      .hud-chip .k{ display:block; font-size:11px; letter-spacing:.12em; color:rgba(152,160,199,.95); }
      .hud-chip .v{ display:block; font-size:16px; color:#e8ecff; margin-top:2px; }
    `;
    document.head.appendChild(css);

    updateTime();
    setInterval(updateTime, 1000);
  }

  function setMoney(n){ state.money=n; setText("hud-money", moneyFmt(n)); }
  function setRank(r){ state.rank=r; setText("hud-rank", r); }
  function setPot(n){ state.pot=n; setText("hud-pot", moneyFmt(n)); }

  function setText(id, txt){
    const node = document.getElementById(id);
    if (node) node.textContent = txt;
  }

  function updateTime(){
    const d=new Date();
    const hh=String(d.getHours()).padStart(2,"0");
    const mm=String(d.getMinutes()).padStart(2,"0");
    const ss=String(d.getSeconds()).padStart(2,"0");
    setText("hud-time", `${hh}:${mm}:${ss}`);
  }

  function moneyFmt(n){
    const s = Math.round(n).toString();
    return "$" + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  return { init, setMoney, setRank, setPot, state };
})();
