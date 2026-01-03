import * as THREE from 'three';
import { World } from './world.js';

export const PokerTable = {
    scene: null,
    tableCenter: new THREE.Vector3(0,1,0),
    cards: [],
    chips: [],
    buttons: [],
    textures: ['card_red.jpg','card_blue.jpg','chip_red.jpg','chip_blue.jpg','chip_green.jpg'],
    cardGeo: new THREE.BoxGeometry(0.5,0.01,0.75),
    chipGeo: new THREE.CylinderGeometry(0.2,0.2,0.05,16),

    init(scene){
        this.scene = scene;
        this.spawnTable();
        this.spawnButtons();
        this.spawnChips();
        this.dealCards();
    },

    randomMat(type='card'){
        const idx = Math.floor(Math.random()*this.textures.length);
        const tex = new THREE.TextureLoader().load(`assets/textures/${this.textures[idx]}`);
        return new THREE.MeshStandardMaterial({ map: tex, roughness:0.7, metalness:0.2 });
    },

    spawnTable(){
        const top = new THREE.Mesh(new THREE.CylinderGeometry(4,4,0.3,32),
            new THREE.MeshStandardMaterial({color:0x006600}));
        top.position.copy(this.tableCenter);
        this.scene.add(top);

        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.8,1,8),
            new THREE.MeshStandardMaterial({color:0x111111}));
        leg.position.set(this.tableCenter.x,0.5,this.tableCenter.z);
        this.scene.add(leg);
    },

    spawnButtons(){
        const btnNames=['Fold','Call','Raise'];
        btnNames.forEach((name,i)=>{
            const btn = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.1,0.2),
                new THREE.MeshStandardMaterial({color:0x222222}));
            btn.position.set(this.tableCenter.x+(i-1)*0.6,1.15,this.tableCenter.z+2);
            btn.userData.interactable=true;
            btn.userData.action=name;
            this.scene.add(btn);
            this.buttons.push(btn);
        });
    },

    spawnChips(){
        for(let i=0;i<10;i++){
            const chip = new THREE.Mesh(this.chipGeo,this.randomMat('chip'));
            chip.position.set(this.tableCenter.x+(Math.random()-0.5)*2,
                              1.05,
                              this.tableCenter.z+(Math.random()-0.5)*2);
            chip.userData.grabbable=true;
            this.scene.add(chip);
            World.grabbableObjects.push(chip);
            this.chips.push(chip);
        }
    },

    dealCards(){
        const positions=[
            new THREE.Vector3(this.tableCenter.x-2,1.05,this.tableCenter.z-1),
            new THREE.Vector3(this.tableCenter.x,1.05,this.tableCenter.z-1),
            new THREE.Vector3(this.tableCenter.x+2,1.05,this.tableCenter.z-1)
        ];
        for(let i=0;i<3;i++){
            const card = new THREE.Mesh(this.cardGeo,this.randomMat('card'));
            card.position.set(this.tableCenter.x,1.5,this.tableCenter.z);
            card.userData.grabbable=true;
            this.scene.add(card);
            World.grabbableObjects.push(card);
            this.cards.push(card);

            // Animate to positions
            const target = positions[i];
            let frame=0;
            const duration=60;
            const animate = ()=>{
                if(frame>=duration) return;
                card.position.lerp(target,0.05);
                frame++;
                requestAnimationFrame(animate);
            };
            animate();
        }
    },

    updateHandsInteraction(hands){
        hands.forEach(hand=>{
            if(!hand) return;
            const handPos = new THREE.Vector3();
            hand.getWorldPosition(handPos);

            this.buttons.forEach(btn=>{
                const dist = btn.position.distanceTo(handPos);
                if(dist<0.2 && hand.userData.isSelecting){
                    console.log(`Button pressed: ${btn.userData.action}`);
                    if(hand.controller?.gamepad?.hapticActuators?.[0]){
                        hand.controller.gamepad.hapticActuators[0].pulse(0.3,50);
                    }
                }
            });
        });
    }
};
