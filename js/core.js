import { World } from './world.js';
import { Diagnostics } from './diagnostics.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
// --- NEW ATTACHMENTS ---
import { Store } from './store.js';
import { Admin } from './admin.js';

export const Core = {
    async start() {
        this.modules = { world: false, input: false, store: false, admin: false };
        
        Diagnostics.init(this);
        HUD.init(this);

        try {
            this.world = await World.init(this);
            this.modules.world = true;
            Diagnostics.ok('World Engine Active');
        } catch (e) { Diagnostics.fail('World', e); }

        try {
            Input.init(this);
            this.modules.input = true;
            Diagnostics.ok('Input System Ready');
        } catch (e) { Diagnostics.fail('Input', e); }

        // --- ATTACHING NEW MODULES ---
        try {
            Store.init(this);
            this.store = Store;
            this.modules.store = true;
        } catch (e) { Diagnostics.fail('Store', e); }

        try {
            Admin.init(this);
            this.admin = Admin;
            this.modules.admin = true;
        } catch (e) { Diagnostics.fail('Admin', e); }

        Diagnostics.report(this.modules);
    }
};
