/**
 * SCARLETT VR CORE ENGINE - v1.4.5
 * [State Management & Physics Constraints]
 */

const SCARLETT = {
    state: {
        wallet: parseInt(localStorage.getItem('p_wallet')) || 1000,
        isSitting: false,
        currentZone: 'lobby',
        dailyStreak: parseInt(localStorage.getItem('p_streak')) || 500
    },

    init() {
        this.syncUI();
        this.setupOculusListeners();
        console.log("Scarlett DNA Initialized");
    },

    syncUI() {
        // Updates all wallet displays globally
        document.querySelectorAll('.wallet-ui').forEach(el => {
            el.setAttribute('value', `$${this.state.wallet.toLocaleString()}`);
        });
        localStorage.setItem('p_wallet', this.state.wallet);
    },

    // LOCK LOGIC: Prevents jumping out of seat
    toggleSitting(isSittingNow) {
        const rig = document.querySelector('#rig');
        this.state.isSitting = isSittingNow;
        
        if (isSittingNow) {
            rig.removeAttribute('blink-controls'); // Disable teleportation
            this.notify("SEATED: USE MENU TO STAND");
        } else {
            rig.setAttribute('blink-controls', 'cameraRig: #rig; teleportableEntities: .clickable');
            this.notify("STANDING");
        }
    },

    teleport(zone) {
        if (this.state.isSitting) {
            this.notify("STAND UP FIRST");
            return;
        }
        const rig = document.querySelector('#rig');
        const points = {
            'lobby': {x: 0, y: 0, z: 5},
            'store': {x: 50, y: 0, z: 50},
            'scorpion': {x: -50, y: 0, z: -45}
        };
        rig.setAttribute('position', points[zone]);
        this.haptic(0.5, 100);
    },

    haptic(intensity, duration) {
        const controller = document.querySelector('#right-hand');
        if (controller?.components['oculus-touch-controls']?.gamepad?.hapticActuators) {
            controller.components['oculus-touch-controls'].gamepad.hapticActuators[0].pulse(intensity, duration);
        }
    },

    notify(text) {
        const panel = document.querySelector('#notif-panel');
        document.querySelector('#notif-text').setAttribute('value', text);
        panel.setAttribute('visible', 'true');
        setTimeout(() => panel.setAttribute('visible', 'false'), 3000);
    }
};

SCARLETT.init();
