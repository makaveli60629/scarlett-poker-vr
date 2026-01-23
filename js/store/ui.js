export class StoreUI{
  constructor({ catalog, profile, onProfileChanged }){
    this.catalog = catalog;
    this.profile = profile;
    this.onProfileChanged = onProfileChanged || (()=>{});
    this.selectedId = null;

    this.panel = document.getElementById('storePanel');
    this.grid = document.getElementById('storeGrid');
    this.tabs = document.getElementById('storeTabs');

    this.previewTitle = document.getElementById('previewTitle');
    this.previewType = document.getElementById('previewType');
    this.previewPrice = document.getElementById('previewPrice');
    this.previewStatus = document.getElementById('previewStatus');
    this.previewThumb = document.getElementById('previewThumb');

    this.btnBuy = document.getElementById('btnBuy');
    this.btnEquip = document.getElementById('btnEquip');
    this.btnClose = document.getElementById('btnCloseStore');
    this.btnGrant = document.getElementById('btnGrant');
    this.btnReset = document.getElementById('btnResetProfile');

    this.activeType = 'all';
    this._kioskRefresh = false;

    this.btnClose.addEventListener('click', ()=>this.close());
    this.btnGrant.addEventListener('click', ()=>{
      this.profile.grant(100);
      this.onProfileChanged();
      this.render();
    });
    this.btnReset.addEventListener('click', ()=>{
      this.profile.reset();
      this.onProfileChanged();
      this._kioskRefresh = true;
      this.render();
    });

    this.btnBuy.addEventListener('click', ()=>this.buySelected());
    this.btnEquip.addEventListener('click', ()=>this.equipSelected());

    this.buildTabs();
    this.render();
  }

  isOpen(){ return !this.panel.classList.contains('hidden'); }
  open(){ this.panel.classList.remove('hidden'); this.render(); }
  close(){ this.panel.classList.add('hidden'); }

  consumeKioskRefresh(){
    const v = this._kioskRefresh;
    this._kioskRefresh = false;
    return v;
  }

  buildTabs(){
    const types = ['all','avatar','cosmetic','prop','fx'];
    this.tabs.innerHTML = '';
    types.forEach(t=>{
      const b = document.createElement('button');
      b.className = 'tab' + (t===this.activeType ? ' active' : '');
      b.textContent = t.toUpperCase();
      b.addEventListener('click', ()=>{
        this.activeType = t;
        [...this.tabs.children].forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        this.renderGrid();
      });
      this.tabs.appendChild(b);
    });
  }

  selectItem(itemId){
    this.selectedId = itemId;
    this.renderPreview();
  }

  get selected(){
    return this.catalog.items.find(i=>i.id===this.selectedId) || null;
  }

  render(){
    this.renderGrid();
    this.renderPreview();
  }

  renderGrid(){
    const items = this.catalog.items.filter(i=> this.activeType==='all' ? true : i.type===this.activeType);
    this.grid.innerHTML = '';
    items.forEach(item=>{
      const owned = this.profile.owns(item.id);
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="name">${escapeHtml(item.name)}</div>
        <div class="meta">
          <span>${escapeHtml(item.type)}</span>
          <span>${item.price} ◎</span>
        </div>
        <div>
          <span class="badge ${owned?'owned':'locked'}">${owned?'OWNED':'LOCKED'}</span>
          <span class="badge">${escapeHtml(item.rarity || 'common')}</span>
        </div>
      `;
      card.addEventListener('click', ()=>{
        this.selectedId = item.id;
        this.renderPreview();
      });
      this.grid.appendChild(card);
    });
  }

  renderPreview(){
    const item = this.selected;
    if (!item){
      this.previewTitle.textContent = 'Select an item';
      this.previewType.textContent = '—';
      this.previewPrice.textContent = '—';
      this.previewStatus.textContent = '—';
      this.previewThumb.textContent = 'Preview';
      return;
    }
    const owned = this.profile.owns(item.id);
    const equipped = Object.values(this.profile.equipped || {}).includes(item.id);

    this.previewTitle.textContent = item.name;
    this.previewType.textContent = item.type;
    this.previewPrice.textContent = `${item.price} ◎`;
    this.previewStatus.textContent = equipped ? 'EQUIPPED' : (owned ? 'OWNED' : 'LOCKED');
    this.previewThumb.textContent = item.thumb || 'Preview';

    this.btnBuy.disabled = owned || item.price<=0;
    this.btnEquip.disabled = !owned || equipped;
  }

  buySelected(){
    const item = this.selected;
    if (!item) return;
    const res = this.profile.buy(item);
    this.onProfileChanged();
    if (res.ok){
      this._kioskRefresh = true;
    }
    this.render();
  }

  equipSelected(){
    const item = this.selected;
    if (!item) return;
    const res = this.profile.equip(item);
    this.onProfileChanged();
    this.render();
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}
