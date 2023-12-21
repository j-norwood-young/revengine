/**
 * @fileoverview This file contains the implementation of the SailthruImporter class, which is responsible for importing Sailthru data.
 * @module SailthruImporter
 */

import { EventEmitter } from "events";

import config from "config";
import dotenv from "dotenv";
dotenv.config();
// const fs = require("fs");
import fs from "fs";
// const path = require("path");
import path from "path";
// const JXPHelper = require("jxp-helper");
import JXPHelper from "jxp-helper";
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY, hideErrors: true });

const SAILTHRU_LOGS_MAP = {
    "blast": {
        collection: "sailthru_blast",
    },
    "message_blast": {
        collection: "sailthru_message",
    },
    "message_blast_updates": {
        collection: "sailthru_message",
    },
    "message_transactional": {
        collection: "sailthru_message",
    },
    "message_transactional_updates": {
        collection: "sailthru_message",
    },
    "profile": {
        collection: "sailthru_profile",
    },
}
/**
 * The SailthruImporter class is responsible for importing Sailthru data.
 * @extends EventEmitter
 */
export class SailthruLogImporter extends EventEmitter {
    constructor() {
        super();
        this.name = 'Sailthru';
        this.description = 'Import Sailthru data';
    }

    /**
     * Imports Sailthru data.
     * @param {string} type - The type of data to import.
     * @param {Date} date - The date of the data to import.
     * @param {Object} options - Additional options for the import.
     * @returns {Promise<void>} A promise that resolves when the import is complete.
     */
    async import(type=null, date=null, options={}) {
        if (!type) {
            console.error("No type specified");
            return;
        }
        for (let key in SAILTHRU_LOGS_MAP) {
            if (key === type) {
                type = key;
                break;
            }
        }
        if (!SAILTHRU_LOGS_MAP[type]) {
            console.error(`Unknown type: ${type}`);
            return;
        }
        const sailthru_logs_type = SAILTHRU_LOGS_MAP[type];
        if (!date) {
            // Yesterday
            date = new Date();
            date.setDate(date.getDate() - 1);
        }
        this.date = date;
        const filename = this._filename(type, date);
        // console.log(`===Importing ${type} from ${date} (${filename})===`);
        const filepath = path.join(config.sailthru.log_dir, filename);
        if (!fs.existsSync(filepath)) {
            console.error(`File not found: ${filepath}`);
            return;
        }
        const stream = fs.createReadStream(filepath, { encoding: 'utf8' });
        const fsize = fs.statSync(filepath).size;
        this.emit('start', { type, date, filename, fsize });
        let buffer = '';
        let linecount = 0;
        let progress = 0;
        stream.on('data', async chunk => {
            buffer += chunk;
            progress += chunk.length;
            const lines = buffer.split('\n');
            // Check if we have 1000 lines
            if (lines.length < 1000) return;
            buffer = lines.pop();
            stream.pause();
            await this._write_lines(lines, sailthru_logs_type.collection);
            stream.resume();
            linecount += lines.length;
            this.emit('progress', { linecount, progress, fsize });
        });
        stream.on('end', async () => {
            const lines = buffer.split('\n');
            await this._write_lines(lines, sailthru_logs_type.collection);
            linecount += lines.length;
            // console.log(`Imported ${linecount} lines`);
            this.emit('progress', { linecount, progress, fsize });
            this.emit('done');
        });
    }

    /**
     * Writes the given lines to the database.
     * @param {string[]} lines - The lines to write.
     * @param {string} collection - The collection to write to.
     * @returns {Promise<void>} A promise that resolves when the lines are written.
     * @private
     */
    async _write_lines(lines, collection) {
        let mongo_lines = [];
        for (let line of lines) {
            try {
                if (!line) continue;
                const data = JSON.parse(line);
                data.sailthru_last_updated = this.date; 
                if (!data.id) continue;
                const mongo_update = {
                    "updateOne": {
                        "upsert": true,
                        "update": data,
                        "filter": {
                            "id": data.id,
                            "sailthru_last_updated": { "$lte": this.date },
                        }
                    }
                };
                mongo_lines.push(mongo_update);
            } catch(err) {
                console.error(err);
            }
        }
        if (mongo_lines.length > 0) {
            try {
                // console.log(mongo_lines[0]);
                const result = await apihelper.bulk(collection, mongo_lines);
                // console.log(result);
            } catch(err) {
                // console.error(err);
            }
        }
    }

    /**
     * Generates the filename for the given type and date.
     * @param {string} type - The type of data.
     * @param {Date} date - The date of the data.
     * @returns {string} The generated filename.
     * @private
     */
    _filename(type, date) {
        // Date format: YYYYMMDD
        const strdate = date.toISOString().split('T')[0].replace(/-/g, '');
        return `${config.sailthru.log_prefix}${type}.${strdate}.json`;
    }
}