import { World } from './world.js';
import { Diagnostics } from './diagnostics.js';
import { Input } from './input.js';
import { HUD } from './hud.js';

export const Core = {
    async start() {
        this.modules = { world: false, input: false, hud: false };
        
        // 1. Diagnostics First
        Diagnostics.init(this);
        
        // 2. HUD Second
        HUD.init(this);

        // 3. World Engine
        try {
            this.world = await World.init(this);
            this.modules.world = true;
            Diagnostics.ok('World Engine Active');
        } catch (e) {
            Diagnostics.fail('World', e);
        }

        // 4. Input Systems (Hands + Touch)
        try {
            Input.init(this);
            this.modules.input = true;
            Diagnostics.ok('Input System Ready');
        } catch (e) {
            Diagnostics.fail('Input', e);
        }

        Diagnostics.report(this.modules);
    }
};
