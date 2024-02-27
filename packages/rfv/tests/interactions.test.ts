import moment from "moment";
import { get_memberships } from "../interactions/membership";

test("populate memberships", async () => {
    const mday = moment("2023-12-30");
    const interactions = await get_memberships(mday);
    expect(interactions.length).toBeGreaterThan(0);
    expect(interactions[0].uid).toBeDefined();
    expect(interactions[0].monthly_value).toBeDefined();
    expect(interactions[0].date_paid).toBeDefined();
    expect(interactions[0].lifetime_value).toBeDefined();
}, 100000)