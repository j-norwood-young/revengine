// Check if users are in the readers collection (by external_id)
// Creates a list of missing users

// Usage: node scripts/sync_missing_users.js

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { connect, aggregate, close, bulkWrite } from '../packages/common/mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_FILE_PATH = join(__dirname, '../data/missing_users.json');
const INPUT_FILE_PATH = join(__dirname, '../data/export_customers_6939723107d87.csv');

const main = async () => {
    try {
        console.log('Connecting to database...');
        await connect();
        console.log('Connected to database');

        // Get all users from the input file
        console.log('Fetching all users from the input file...');
        const fileContent = await readFileSync(INPUT_FILE_PATH, 'utf8');
        let users = fileContent.split('\n').map(line => line.split(','));
        users.shift();
        users = users.map(user => user[0]);
        users = users.filter(user => user && user.length > 0 && Number.isFinite(Number(user))).map(Number);
        console.log(`Found ${users.length} users to check`);

        // Get all readers with their external_id field
        console.log('Fetching all readers...');
        const readers = await aggregate('readers', [
            { $project: { _id: 1, external_id: 1, email: 1 } }
        ]);
        console.log(`Found ${readers.length} readers`);

        // Create a Set of all external_ids from readers for fast lookup
        const readerExternalIds = new Set(
            readers
                .map(reader => reader.external_id)
                .filter(id => id != null && Number.isFinite(Number(id)))
                .map(id => Number(id))
        );
        console.log(`Found ${readerExternalIds.size} unique external_ids in readers`);

        // Find users whose id is not in the readers' external_id list
        console.log('Finding missing users...');
        const missingUsers = users
            .filter(userId => !readerExternalIds.has(userId));
        console.log(`Found ${missingUsers.length} missing users`);

        // Save missing users to JSON file
        writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(missingUsers, null, 2), 'utf8');
        console.log(`Saved ${missingUsers.length} missing users to ${OUTPUT_FILE_PATH}`);

        // For each missing user, call N8N callback to sync the user
        console.log('Syncing missing users through N8N callback...');
        const n8nCallbackUrl = 'https://n8n.revengine.dailymaverick.co.za/webhook/wb-customer-updated';
        for (const user of missingUsers) {
            const response = await fetch(n8nCallbackUrl, {
                method: 'POST',
                body: JSON.stringify({ parameters: { visitor_id: user } }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            // console.log(`Callback response:`, response.status, response.statusText);
            if (response.status !== 200) {
                console.error(`Failed to sync missing user ${user} through N8N callback`);
                throw new Error(`Failed to sync missing user ${user} through N8N callback`);
            }
        }
    } catch (error) {
        console.error('Error during check:', error);
        throw error;
    } finally {
        await close();
        console.log('Database connection closed');
    }
};

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});