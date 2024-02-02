const revengine_wordpress = require("../revengine_wordpress")

describe("revengine_wordpress", () => {
    let post_id = null;
    it("should fetch articles", async () => {
        const articles = await revengine_wordpress.get_articles()
        expect(articles.page).toBe(1);
        expect(articles.per_page).toBe(10);
        expect(articles.total_count).toBeGreaterThan(0);
        expect(articles.page_count).toBeGreaterThan(0);
        expect(articles.next).toBeDefined();
        expect(articles.data.length).toBe(10);
        expect(articles.data[0].post_id).toBeDefined();
        post_id = articles.data[0].post_id;
    }, 30000);

    it("should fetch opinions", async () => {
        const opinions = await revengine_wordpress.get_opinions()
        expect(opinions.page).toBe(1);
        expect(opinions.per_page).toBe(10);
        expect(opinions.total_count).toBeGreaterThan(0);
        expect(opinions.page_count).toBeGreaterThan(0);
        expect(opinions.next).toBeDefined();
        expect(opinions.data.length).toBe(10);
        expect(opinions.data[0].post_id).toBeDefined();
    }, 30000);

    it("should fetch cartoons", async () => {
        const cartoons = await revengine_wordpress.get_cartoons()
        expect(cartoons.page).toBe(1);
        expect(cartoons.per_page).toBe(10);
        expect(cartoons.total_count).toBeGreaterThan(0);
        expect(cartoons.page_count).toBeGreaterThan(0);
        expect(cartoons.next).toBeDefined();
        expect(cartoons.data.length).toBe(10);
        expect(cartoons.data[0].post_id).toBeDefined();
    }, 30000);

    it("should fetch featured", async () => {
        const featured = await revengine_wordpress.get_featured()
        // console.log(featured)
        expect(featured.total_count).toBeGreaterThan(0);
        expect(featured.data.length).toBeGreaterThan(0);
        expect(featured.data[0].post_id).toBeDefined();
        expect(featured.data[0].position).toBe(0);
        expect(featured.data[1].position).toBe(1);
        expect(featured.data[2].position).toBe(2);
    }, 30000);

    it("should fetch users", async () => {
        const users = await revengine_wordpress.get_users()
        expect(users.page).toBe(1);
        expect(users.per_page).toBe(10);
        expect(users.total_count).toBeGreaterThan(0);
        expect(users.page_count).toBeGreaterThan(0);
        expect(users.next).toBeDefined();
        expect(users.data.length).toBe(10);
        expect(users.data[0].id).toBeDefined();
        expect(users.data[0].user_email).toBeDefined();
    }, 30000);

    it("should fetch woocommerce orders", async () => {
        const orders = await revengine_wordpress.get_woocommerce_orders()
        expect(orders.page).toBe(1);
        expect(orders.per_page).toBe(10);
        expect(orders.total_count).toBeGreaterThan(0);
        expect(orders.page_count).toBeGreaterThan(0);
        expect(orders.next).toBeDefined();
        expect(orders.data.length).toBe(10);
        expect(orders.data[0].id).toBeDefined();
        expect(orders.data[0].customer_id).toBeDefined();
    }, 30000);

    it("should fetch woocommerce subscriptions", async () => {
        const subscriptions = await revengine_wordpress.get_woocommerce_subscriptions()
        expect(subscriptions.page).toBe(1);
        expect(subscriptions.per_page).toBe(10);
        expect(subscriptions.total_count).toBeGreaterThan(0);
        expect(subscriptions.page_count).toBeGreaterThan(0);
        expect(subscriptions.next).toBeDefined();
        expect(subscriptions.data.length).toBe(10);
        expect(subscriptions.data[0].id).toBeDefined();
        expect(subscriptions.data[0].customer_id).toBeDefined();
        expect(subscriptions.data[0].status).toBeDefined();
    }, 30000);

    it("should fetch woocommerce memberships", async () => {
        const memberships = await revengine_wordpress.get_woocommerce_memberships()
        expect(memberships.page).toBe(1);
        expect(memberships.per_page).toBe(10);
        expect(memberships.total_count).toBeGreaterThan(0);
        expect(memberships.page_count).toBeGreaterThan(0);
        expect(memberships.next).toBeDefined();
        expect(memberships.data.length).toBe(10);
        expect(memberships.data[0].id).toBeDefined();
        expect(memberships.data[0].customer_id).toBeDefined();
        expect(memberships.data[0].order).toHaveProperty("id");
        expect(memberships.data[0].order).toHaveProperty("order_key");
        expect(memberships.data[0].user).toHaveProperty("user_email");
        expect(memberships.data[0].product).toHaveProperty("id");
    }, 30000);
    
    it("should fetch a post", async () => {
        const post = await revengine_wordpress.get_post(post_id)
        expect(post.data.post_id).toBe(post_id);
        expect(post.data.title).toBeDefined();
        expect(post.data.content).toBeDefined();
    }, 30000);
});
