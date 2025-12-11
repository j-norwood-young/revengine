// Import hits from Elasticsearch, unique per user_id, and populate the location fields in the reader collection

import { connect, find, bulkWrite, close } from '@revengine/common/mongo.js';
import esclient from '@revengine/common/esclient.js';
import fs from 'fs';
import path from 'path';

const main = async () => {
    try {
        console.log('Connecting to database...');
        await connect();
        console.log('Connected to database');
        console.log('Connecting to Elasticsearch...');
        console.log('Populating locations...');
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000 * 1);
        
        // Collect user data with derived fields by paginating through composite aggregation
        const userDataMap = new Map(); // Map<user_id, {derived_fields}>
        const userSourceDataMap = new Map(); // Map<user_id, {full_source_data}> for missing users
        let after_key = null;
        
        do {
            const query_body = {
                query: {
                    bool: {
                        must: [
                            {
                                range: {
                                    "time": {
                                        gte: yesterday.toISOString(),
                                        lte: now.toISOString(),
                                    }
                                }
                            },
                            {
                                exists: {
                                    field: "user_id"
                                }
                            }
                        ]
                    }
                },
                size: 0,
                sort: [
                    {
                        time: {
                            order: 'desc',
                            unmapped_type: 'date'
                        }
                    }
                ],
                aggregations: {
                    unique_user_ids: {
                        composite: {
                            sources: [
                                { user_id: { terms: { field: 'user_id' } } }
                            ],
                            size: 1000
                        },
                        aggs: {
                            latest_hit: {
                                top_hits: {
                                    size: 1,
                                    sort: [
                                        {
                                            time: {
                                                order: 'desc',
                                                unmapped_type: 'date'
                                            }
                                        }
                                    ],
                                    _source: {
                                        includes: [
                                            'time',
                                            'email',
                                            'derived_city',
                                            'derived_country',
                                            'derived_country_code',
                                            'derived_latitude',
                                            'derived_longitude',
                                            'derived_referer_medium',
                                            'derived_region',
                                            'derived_ua_browser',
                                            'derived_ua_browser_version',
                                            'derived_ua_device',
                                            'derived_ua_os',
                                            'derived_ua_os_version',
                                            'derived_ua_platform',
                                            'derived_utm_campaign',
                                            'derived_utm_medium',
                                            'derived_utm_source'
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            };

            // console.log('Query body:', JSON.stringify(query_body, null, 2));
            
            // Add after_key for pagination if we have one
            if (after_key) {
                query_body.aggregations.unique_user_ids.composite.after = after_key;
            }
            
            const es_result = await esclient.search({
                index: 'pageviews_copy',
                body: query_body
            });
            
            const buckets = es_result.aggregations?.unique_user_ids?.buckets || [];
            
            for (const bucket of buckets) {
                const user_id = Number(bucket.key.user_id);
                const latest_hit = bucket.latest_hit?.hits?.hits?.[0]?._source;
                
                if (latest_hit && latest_hit.time && latest_hit.email && user_id) {
                    const hitTime = new Date(latest_hit.time).getTime();
                    
                    // Check if we already have data for this user_id
                    const existingData = userDataMap.get(user_id);
                    if (existingData && existingData._timestamp) {
                        // Only update if this record is more recent
                        if (hitTime <= existingData._timestamp) {
                            continue; // Skip this record, existing one is more recent
                        }
                    }
                    
                    // Map Elasticsearch fields to reader model fields
                    const readerData = {};
                    
                    if (latest_hit.derived_city) readerData.city = latest_hit.derived_city;
                    if (latest_hit.derived_country) readerData.country = latest_hit.derived_country;
                    if (latest_hit.derived_region) readerData.region = latest_hit.derived_region;
                    if (latest_hit.derived_latitude !== undefined && latest_hit.derived_latitude !== null) {
                        readerData.latitude = latest_hit.derived_latitude;
                    }
                    if (latest_hit.derived_longitude !== undefined && latest_hit.derived_longitude !== null) {
                        readerData.longitude = latest_hit.derived_longitude;
                    }
                    // Use utm_medium if available, otherwise fall back to referer_medium
                    if (latest_hit.derived_utm_medium) {
                        readerData.medium = latest_hit.derived_utm_medium;
                    } else if (latest_hit.derived_referer_medium) {
                        readerData.medium = latest_hit.derived_referer_medium;
                    }
                    if (latest_hit.derived_utm_source) readerData.source = latest_hit.derived_utm_source;
                    if (latest_hit.derived_utm_campaign) readerData.campaign = latest_hit.derived_utm_campaign;
                    if (latest_hit.derived_ua_browser) readerData.browser = latest_hit.derived_ua_browser;
                    if (latest_hit.derived_ua_browser_version) readerData.browser_version = latest_hit.derived_ua_browser_version;
                    if (latest_hit.derived_ua_device) readerData.device = latest_hit.derived_ua_device;
                    if (latest_hit.derived_ua_os) readerData.operating_system = latest_hit.derived_ua_os;
                    if (latest_hit.derived_ua_os_version) readerData.os_version = latest_hit.derived_ua_os_version;
                    if (latest_hit.derived_ua_platform) readerData.platform = latest_hit.derived_ua_platform;
                    readerData.last_login = latest_hit.time;
                    readerData.recency = latest_hit.time;
                    if (latest_hit.email) readerData.email = latest_hit.email.toLowerCase().trim();
                    
                    // Store timestamp for comparison (will be removed before saving to DB)
                    readerData._timestamp = hitTime;
                    
                    // Store the data (always update since we've already checked timestamp)
                    readerData.external_id = user_id;
                    readerData.time = latest_hit.time;
                    userDataMap.set(user_id, readerData);
                }
            }
            
            console.log(`Processed ${buckets.length} user IDs (total: ${userDataMap.size})`);
            
            // Check if there are more pages
            after_key = es_result.aggregations?.unique_user_ids?.after_key || null;
        // } while (false);
        } while (after_key);
        
        // Get all user_ids to find matching readers
        const user_ids = Array.from(userDataMap.keys());
        const readers = await find('readers', { external_id: { $in: user_ids } });
        console.log(`Found ${readers.length} matching readers out of ${user_ids.length} user IDs from Elasticsearch`);
        
        // Find missing users (user_ids that don't have matching readers)
        const matchedUserIds = new Set(readers.map(reader => reader.external_id));
        const missingUserIds = user_ids.filter(user_id => !matchedUserIds.has(user_id));
        
        console.log(`Missing ${missingUserIds.length} users in readers collection`);
        
        // Collect missing user data
        const missingUsers = [];
        for (const user_id of missingUserIds) {
            const sourceData = userSourceDataMap.get(user_id);
            if (sourceData) {
                missingUsers.push(sourceData);
            }
        }
        
        // Save missing users to JSON file
        if (missingUsers.length > 0) {
            const dataDir = path.join(process.cwd(), 'data');
            const outputPath = path.join(dataDir, 'populate_locations_missing_users.json');
            
            // Ensure data directory exists
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // Write missing users to file
            fs.writeFileSync(outputPath, JSON.stringify(missingUsers, null, 2), 'utf8');
            console.log(`Saved ${missingUsers.length} missing users to ${outputPath}`);
        } else {
            console.log('No missing users to save');
        }

        // Add missing users to readers collection
        const missingUsersOps = [];
        for (const user of missingUsers) {
            missingUsersOps.push({
                insertOne: {
                    document: user
                }
            });
        }
        if (missingUsersOps.length > 0) {
            console.log(`Adding ${missingUsersOps.length} missing users to readers collection...`);
            const result = await bulkWrite('readers', missingUsersOps);
            console.log(`Bulk write result:`, {
                insertedCount: result.insertedCount
            });
        } else {
            console.log('No missing users to add to readers collection');
        }

        // Add missing users to readers collection through callback to n8n
        const n8nCallbackUrl = 'https://n8n.revengine.dailymaverick.co.za/webhook/wb-customer-updated';
        for (const user of missingUsers) {
            const response = await fetch(n8nCallbackUrl, {
                method: 'POST',
                body: JSON.stringify({
                    parameters: {
                        visitor_id: user.external_id
                    }
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log(`Callback response:`, response.status, response.statusText);
            if (response.status !== 200) {
                console.error(`Failed to add missing user ${user.external_id} to readers collection through callback to n8n`);
            }
        }
        
        // Create bulk write operations
        const bulkOps = [];
        for (const reader of readers) {
            const user_id = reader.external_id;
            const readerData = userDataMap.get(user_id);
            if (readerData?.email !== reader.email) {
                console.log(`Reader ${user_id} email mismatch: ${readerData?.email} !== ${reader.email}`);
                continue;
            }
            if (readerData && Object.keys(readerData).length > 0) {
                // Remove the internal _timestamp field before saving
                const { _timestamp, ...dataToSave } = readerData;
                
                bulkOps.push({
                    updateOne: {
                        filter: { _id: reader._id },
                        update: { $set: dataToSave }
                    }
                });
            }
        }
        
        if (bulkOps.length > 0) {
            console.log(`Updating ${bulkOps.length} readers...`);
            // console.log('Bulk ops:', JSON.stringify(bulkOps, null, 2));
            const result = await bulkWrite('readers', bulkOps);
            console.log(`Bulk write result:`, {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                upsertedCount: result.upsertedCount
            });
        } else {
            console.log('No readers to update');
        }
        
        await close();
    } catch (err) {
        console.error(err);
        await close();
    }
}

main();