# ScarlettVR Poker — Update 4.0 FULL (All 5 Modules)

Generated: 2026-01-22 20:44 UTC

Repo-aligned assets:
- assets/textures/cards/scarlett_card_faces_atlas_2048.png
- assets/textures/cards/scarlett_card_faces_atlas_2048.json
- assets/textures/cards/scarlett_card_back_512x712.png
- assets/textures/table_felt_green.jpg (fallback assets/textures/felt.png)
- assets/textures/chips.png (optional)

## Included Modules
1) Chip stacks atlas: js/modules/chips_atlas.js
2) Seat snapping: js/modules/seating.js
3) Multiplayer hooks: js/modules/net_hooks.js
4) Scorpion room variant: js/modules/scorpion_room.js
5) Quest hand tracking polish: js/modules/hands.js

## Hard Rules
- Hands-only (no controller models)
- Pedestal unity: table/chairs/chandelier under Pedestal_Root
- Box protocol: Dealer_Shoe_Box emits scarlett:shoe_touch

## Quick test
- Demo Deal: shows two cards at current seat
- Sit/Stand: snaps camera to seat anchor
- Touch Dealer_Shoe_Box in VR hands to deal (also emits net hook event)
