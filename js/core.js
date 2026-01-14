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

        const load = async (name, module) => {
            try {
                await module.init(this);
                this.modules[name] = true;
                this[name.toLowerCase()] = module;
                Diagnostics.ok(`${name} Module`);
            } catch (e) {
                Diagnostics.fail(name, e);
                this.modules[name] = false;
            }
        };

        await load('World', World);
        await load('Input', Input);
        await load('Store', Store);
        await load('Admin', Admin);

        Diagnostics.report(this.modules);
    }
};
