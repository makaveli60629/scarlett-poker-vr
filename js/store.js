export const Store = {
    init(ctx) {
        this.ctx = ctx;
        this.catalog = [
            { id: 'gold_skin', name: 'Gold Hand Texture', price: 500, texture: 'assets/textures/gold_hand.jpg' },
            { id: 'royal_table', name: 'Royal Felt', price: 1000, texture: 'assets/textures/table_royal.jpg' }
        ];
        this.inventory = [];
        ctx.Diagnostics.ok('Store Module Loaded');
    },

    purchase(itemId) {
        const item = this.catalog.find(i => i.id === itemId);
        if (item) {
            this.inventory.push(item);
            this.ctx.Diagnostics.log(`Purchased: ${item.name}`);
            // Here we would trigger the texture swap logic
        }
    }
};
