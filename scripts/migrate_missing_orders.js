// Migrate orders from JSON export file to orders collection
// Usage: node scripts/migrate_missing_orders.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { connect, find, bulkWrite, close } from '../packages/common/mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JSON_FILE_PATH = join(__dirname, '../data/orders_export.json');
const BATCH_SIZE = 400;

// Build reader cache by doing bulk lookup of all unique user_ids
const buildReaderCache = async (userIds) => {
    const uniqueUserIds = [...new Set(userIds.filter(id => id && Number.isFinite(Number(id))))].map(Number);
    
    if (uniqueUserIds.length === 0) {
        return {};
    }
    
    console.log(`Looking up ${uniqueUserIds.length} unique readers...`);
    const readers = await find('readers', { external_id: { $in: uniqueUserIds } });
    
    const cache = {};
    for (const reader of readers) {
        if (reader.external_id) {
            cache[String(reader.external_id)] = reader._id;
        }
    }
    
    console.log(`Found ${readers.length} readers`);
    return cache;
};

const main = async () => {
    try {
        console.log('Connecting to database...');
        await connect();
        
        console.log(`Reading orders from ${JSON_FILE_PATH}...`);
        const fileContent = readFileSync(JSON_FILE_PATH, 'utf8');
        const orders = JSON.parse(fileContent);
        
        if (!Array.isArray(orders)) {
            throw new Error('JSON file must contain an array of orders');
        }
        
        console.log(`Found ${orders.length} orders to process`);
        
        // Collect all unique user_ids and build reader cache upfront
        console.log('Collecting unique user_ids...');
        const userIds = orders
            .map(order => order.user_id)
            .filter(id => id != null);
        const readerCache = await buildReaderCache(userIds);
        
        let ops = [];
        let processed = 0;
        
        for (const order of orders) {
            // Skip orders without external_id
            if (!order.external_id || !Number.isFinite(Number(order.external_id))) {
                continue;
            }
            
            // Get reader_id from cache
            const reader_id = order.user_id ? (readerCache[String(order.user_id)] || null) : null;
            
            const processedOrder = {
                provider: order.provider,
                external_id: Number(order.external_id),
                reader_id,
                date_completed: order.date_completed ? new Date(order.date_completed) : null,
                status: order.status || 'pending',
                date_created: order.date_created ? new Date(order.date_created) : null,
                date_modified: order.date_modified ? new Date(order.date_modified) : null,
                date_paid: order.date_paid ? new Date(order.date_paid) : null,
                payment_method: order.payment_method || null,
                products: Array.isArray(order.products) ? order.products.map(product => ({
                    external_id: Number.isFinite(Number(product.external_id)) ? Number(product.external_id) : null,
                    product_name: product.product_name || '',
                    product_description: product.product_description || product.product_name || '',
                    product_quantity: Number(product.product_quantity) || 1,
                    product_price: Number(product.product_price) || 0
                })) : [],
                total: Number(order.total) || 0
            };
            
            ops.push({
                replaceOne: {
                    filter: { 
                        // provider: processedOrder.provider, 
                        external_id: processedOrder.external_id 
                    },
                    replacement: processedOrder,
                    upsert: true
                }
            });
            
            if (ops.length >= BATCH_SIZE) {
                await bulkWrite('orders', ops);
                processed += ops.length;
                console.log(`Processed ${processed} / ${orders.length} orders`);
                ops = [];
            }
        }
        
        // Process remaining operations
        if (ops.length > 0) {
            await bulkWrite('orders', ops);
            processed += ops.length;
            console.log(`Processed ${processed} / ${orders.length} orders`);
        }
        
        console.log(`Migration complete! Processed ${processed} orders`);
        
    } catch (error) {
        console.error('Error during migration:', error);
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

