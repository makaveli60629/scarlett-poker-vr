export const Diagnostics = {
    init(ctx) {
        this.ctx = ctx;
        this.log('Diagnostic Core Online');
    },
    log(msg) {
        console.log(`[DIAG] ${msg}`);
        this._updateHUD(msg, 'diag-info');
    },
    ok(msg) {
        console.log(`%c[OK] ${msg}`, 'color: #0f0');
        this._updateHUD(`✔ ${msg}`, 'diag-ok');
    },
    fail(sys, err) {
        console.error(`[FAIL] ${sys}:`, err);
        this._updateHUD(`✖ ${sys}: ${err.message || err}`, 'diag-err');
    },
    report(mods) {
        this.log('--- System Audit Complete ---');
    },
    _updateHUD(msg, className) {
        const h = document.getElementById('hud');
        if (!h) return;
        const line = document.createElement('div');
        line.className = className;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        h.appendChild(line);
    }
};
