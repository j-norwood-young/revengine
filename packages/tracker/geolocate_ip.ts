import config from "config";
import { Reader } from "maxmind";
import * as fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mmdbDir = path.resolve(__dirname, "../../mmdb");

const DBIP_PATTERN = /^dbip-city-lite-(\d{4})-(\d{2})\.mmdb$/;

function getLatestMmdbInDir(dir: string): string | null {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
    const entries = fs.readdirSync(dir);
    const matches = entries
        .map((name) => {
            const m = name.match(DBIP_PATTERN);
            return m ? { name, year: parseInt(m[1], 10), month: parseInt(m[2], 10) } : null;
        })
        .filter((x): x is { name: string; year: number; month: number } => x != null)
        .sort((a, b) => b.year - a.year || b.month - a.month);
    if (matches.length === 0) return null;
    return path.join(dir, matches[0].name);
}

const explicitPath = process.env.MMDB_FILE || (config as any).geoip?.mmdb;
const mmdb_file = explicitPath && fs.existsSync(explicitPath)
    ? explicitPath
    : getLatestMmdbInDir(mmdbDir);

let geo: Reader<unknown> | null = null;
if (mmdb_file && fs.existsSync(mmdb_file)) {
    try {
        const buffer = fs.readFileSync(mmdb_file);
        geo = new Reader(buffer);
    } catch (err) {
        console.warn("geolocate_ip: could not load MMDB file:", mmdb_file, (err as Error).message);
    }
} else {
    console.warn("geolocate_ip: MMDB file not found (geolocation disabled):", mmdb_file ?? mmdbDir);
}

export const geolocate_ip = async function (ip: string) {
    if (!geo) return {};
    const geo_data: any = geo.get(ip);
    if (!geo_data) return {};
    if (config.debug) console.log(`Geodata file: ${mmdb_file}`, JSON.stringify(geo_data, null, 2));
    return {
        derived_city: geo_data.city?.names?.en,
        derived_country: geo_data.country?.names?.en,
        derived_country_code: geo_data.country?.iso_code,
        derived_latitude: geo_data.location?.latitude,
        derived_longitude: geo_data.location?.longitude,
        derived_region: Array.isArray(geo_data.subdivisions) ? geo_data.subdivisions[0]?.names?.en : undefined,
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