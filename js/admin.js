export const Admin = {
    init(ctx) {
        this.ctx = ctx;
        window.adminReset = () => location.reload();
    }
};
