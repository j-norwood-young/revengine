import { geolocate_ip } from '../geolocate_ip';

test('geolocate_ip', async () => {
    const ip = "185.203.122.3";
    const expected = {
        derived_city: "Johannesburg",
        derived_country: "South Africa",
        derived_country_code: "ZA",
        derived_latitude: -26.2023,
        derived_longitude: 28.0436,
        derived_region: "Gauteng",
    }
    const actual = await geolocate_ip(ip);
    expect(actual).toEqual(expected);
});