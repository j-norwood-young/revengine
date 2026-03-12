import esclient from '@revengine/common/esclient';
import { find, close } from '@revengine/common/mongo';
import { subDays } from 'date-fns';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fileURLToPath } from 'url';

type OutputFormat = 'csv' | 'json';

interface ExportOptions {
    filename?: string;
    format?: OutputFormat;
    console?: boolean;
    limit?: number;
    days?: number;
}

async function exportCrosswordUsers(options: ExportOptions = {}) {
    try {
        // Calculate date range
        const endDate = new Date();
        const startDate = subDays(endDate, options.days || 60);

        // Construct Elasticsearch query
        const query = {
            size: 0,
            aggs: {
                "0": {
                    terms: {
                        field: "user_id",
                        order: {
                            "_count": "desc"
                        },
                        size: options.limit || 100
                    }
                }
            },
            query: {
                bool: {
                    must: [],
                    filter: [
                        {
                            match_phrase: {
                                action: "crossword_load"
                            }
                        },
                        {
                            range: {
                                time: {
                                    format: "strict_date_optional_time",
                                    gte: startDate.toISOString(),
                                    lte: endDate.toISOString()
                                }
                            }
                        }
                    ],
                    should: [],
                    must_not: []
                }
            }
        };

        // Execute Elasticsearch query
        const result = await esclient.search({
            index: 'crosswords*',
            body: query
        });

        // Extract user IDs from aggregation results
        const userBuckets = result.aggregations?.["0"]?.buckets || [];
        const userIds = userBuckets.map(bucket => bucket.key);

        // Fetch user details from MongoDB
        const users = await find('wordpressusers', {
            id: { $in: userIds }
        });

        // Map users to their crossword event counts
        const userDetails = users.map(user => {
            const bucket = userBuckets.find(b => b.key.toString() === user.id.toString());
            const count = bucket ? bucket.doc_count : 0;
            return {
                user_id: user.id,
                display_name: user.display_name,
                email: user.user_email,
                crossword_count: count
            };
        });

        // Sort by crossword count (descending)
        userDetails.sort((a, b) => b.crossword_count - a.crossword_count);

        // Determine output format
        const format = options.format || 'csv';
        let output: string;

        if (format === 'csv') {
            output = stringify(userDetails, {
                header: true,
                columns: {
                    user_id: 'User ID',
                    display_name: 'Display Name',
                    email: 'Email',
                    crossword_count: 'Crossword Count'
                }
            });
        } else {
            output = JSON.stringify(userDetails, null, 2);
        }

        // Handle output
        if (options.console) {
            console.log(output);
        }

        if (options.filename) {
            fs.writeFileSync(options.filename, output);
            console.log(`Data has been written to ${options.filename}`);
        }

        return userDetails;
    } catch (error) {
        console.error('Error exporting crossword users:', error);
        throw error;
    } finally {
        // Close MongoDB connection
        await close();
    }
}

// CLI setup
async function main() {
    const argv = await yargs(hideBin(process.argv))
        .option('format', {
            alias: 'f',
            description: 'Output format (csv or json)',
            type: 'string',
            choices: ['csv', 'json'],
            default: 'csv'
        })
        .option('output', {
            alias: 'o',
            description: 'Output filename',
            type: 'string'
        })
        .option('console', {
            alias: 'c',
            description: 'Output to console',
            type: 'boolean',
            default: true
        })
        .option('limit', {
            alias: 'l',
            description: 'Number of results to return',
            type: 'number',
            default: 100
        })
        .option('days', {
            alias: 'd',
            description: 'Number of days to look back',
            type: 'number',
            default: 60
        })
        .help()
        .alias('help', 'h')
        .argv;

    const options: ExportOptions = {
        format: argv.format as OutputFormat,
        filename: argv.output,
        console: argv.console,
        limit: argv.limit,
        days: argv.days
    };

    try {
        await exportCrosswordUsers(options);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

// Export the function for programmatic use
export { exportCrosswordUsers };
