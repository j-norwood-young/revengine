import config from 'config';
import { Reader } from 'maxmind';
import * as fs from 'fs';

const buffer = fs.readFileSync(config.geoip.mmdb);
const geo = new Reader(buffer);

export const geolocate_ip = async function (ip) {
    const geo_data: any = geo.get(ip);
    if (!geo_data) return {};
    if (config.debug) console.log(`Geodata file: ${config.geoip.mmdb}`, JSON.stringify(geo_data, null, 2));
    return {
        derived_city: geo_data.city.names.en,
        derived_country: geo_data.country.names.en,
        derived_country_code: geo_data.country.iso_code,
        derived_latitude: geo_data.location.latitude,
        derived_longitude: geo_data.location.longitude,
        derived_region: Array.isArray(geo_data.subdivisions) ? geo_data.subdivisions[0]?.names.en : undefined,
    }
}

export const geolocate_ip_test = async function () {
    const ip = "8.8.8.8";
    const expected = {
        derived_city: "Mountain View",
        derived_country: "United States",
        derived_country_code: "US",
        derived_latitude: 37.4223,
        derived_longitude: -122.085,
        derived_region: "California",
    }
    const actual = await geolocate_ip(ip);
    console.log(actual);
    console.assert(JSON.stringify(actual) === JSON.stringify(expected));
}

// geolocate_ip_test();