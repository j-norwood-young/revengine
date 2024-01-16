const Wordpress = require('./wordpress');

const program = require("commander")
program
    .version(require('./package.json').version)
    .usage('[options]')
    .option(`-p, --page <page>`, 'Start at page')
    .option('-s, --parts <parts>', 'Number of parts to split into')
    .option('-v, --version', 'JXP version')
    .parse(process.argv);

const options = program.opts();

async function main() {
    try {
        const parts = parseInt(options.parts) || 1;
        const part = parseInt(options.part) || 0;
        await Wordpress.sync_readers_missing_in_wordpress(parts, part);
    } catch(err) {
        console.error(err);
    }
}

main();