import {SailthruLogImporter} from "./sailthru.js";
import { program } from "commander";
import cliProgress from "cli-progress";

async function main() {
    try {
        program
            .option("-p, --program <prog>", "Program to run (sailthru)")
            .option('-d, --date <date>', 'Date')
            .option('-t, --type <type>', 'Type')
            .option('-s, --start <start>', 'Start date')
            .option('-e, --end <end>', 'End date')
            .parse(process.argv);
        const options = program.opts();
        if (options.program === "sailthru") {
            const bars = new cliProgress.MultiBar({
                format: '{bar} | {filename} | {percentage}% | ETA: {eta}s',
            }, cliProgress.Presets.shades_classic);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            let start_date = null;
            let end_date = null;
            if (!options.date && !options.start && !options.end) {
                // Yesterday
                start_date = new Date(yesterday);
                end_date = new Date(start_date);
            }
            else if (options.date) {
                start_date = new Date(options.date);
                end_date = new Date(start_date);
            }
            else if (options.start && options.end) {
                start_date = new Date(options.start);
                end_date = new Date(options.end);
                if (start_date > end_date) {
                    console.error("Start date must be before end date");
                    return;
                }
            }
            else {
                console.error("Invalid options");
                return;
            }
            if (end_date > yesterday) {
                end_date = new Date(yesterday);
            }
            let running_streams = 0;
            for (let d = start_date; d <= end_date; d.setDate(d.getDate() + 1)) {
                const importer = new SailthruLogImporter();
                const bar1 = bars.create(100, 0, { filename: "", lines: 0 });
                importer.on('start', data => {
                    // console.log(`===Importing ${data.type} from ${data.date} (${data.filename})===`);
                    bar1.start(data.fsize, 0, { filename: data.filename, lines: 0 });
                    running_streams++;
                });
                importer.on('progress', count => {
                    // console.log(`Imported ${count} lines`);
                    bar1.update(count.progress, { lines: count.linecount });
                });
                importer.on('done', () => {
                    // console.log("Done");
                    bars.remove(bar1);
                    running_streams--;
                    if (running_streams === 0) {
                        bars.stop();
                    }
                });
                importer.import(options.type, d);
            }
        }
    } catch(err) {
        console.error(err);
    }
}

main();