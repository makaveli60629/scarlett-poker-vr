export const Diagnostics = {
    init(ctx) {
        this.ctx = ctx;
        this.log('Spine Online');
    },
    log(msg) {
        const h = document.getElementById('hud');
        const d = document.createElement('div');
        d.textContent = `> ${msg}`;
        h.appendChild(d);
    },
    ok(name) {
        const h = document.getElementById('hud');
        const d = document.createElement('div');
        d.className = 'diag-ok';
        d.textContent = `✔ ${name} Loaded`;
        h.appendChild(d);
    },
    fail(name, err) {
        const h = document.getElementById('hud');
        const d = document.createElement('div');
        d.className = 'diag-err';
        d.textContent = `✖ ${name} Error: ${err.message || 'Check Console'}`;
        h.appendChild(d);
        console.error(`[${name}]`, err);
    },
    report() {
        this.log('System Audit Ready');
    }
};
