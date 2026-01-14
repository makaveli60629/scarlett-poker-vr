import { World } from './world.js';
import { Diagnostics } from './diagnostics.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { Store } from './store.js';
import { Admin } from './admin.js';

export const Core = {
    async start() {
        this.modules = {};
        Diagnostics.init(this);
        HUD.init(this);

        const loadModule = async (name, mod) => {
            try {
                await mod.init(this);
                this.modules[name] = true;
                Diagnostics.ok(name);
            } catch (e) {
                Diagnostics.fail(name, e);
                this.modules[name] = false;
            }
        };

        await loadModule('World', World);
        await loadModule('Input', Input);
        await loadModule('Store', Store);
        await loadModule('Admin', Admin);

        Diagnostics.report();
    }
};
