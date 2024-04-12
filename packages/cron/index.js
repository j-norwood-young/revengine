const cron = require('node-cron');
const fs = require('fs').promises;
const child_process = require('child_process');

const cronPath = "./packages/cron/cron.d/revengine.cron"

const log = function(msg, level = "info") {
    try {
        if (!msg.trim()) return;
        const date = new Date().toISOString();
        const logline = `${date}\t[${level}]\t${msg}`;
        switch (level) {
            case "info":
                console.log(logline);
                break;
            case "error":
                console.error(logline);
                break;
            default:
                console.log(logline);
        }
    } catch (e) {
        // Fail silently
    }
}

async function main() {
    
    const cronfile = await fs.readFile(cronPath);
    const data = cronfile.toString();
    const tasks = data.split("\n").filter(l => l.trim().length > 0).filter(l => !l.startsWith("#")).map(l => l.trim());
    tasks.forEach(task => {
        try {
            const parts = task.split(/\s+/);
            const schedule = parts.slice(0, 5).join(" ");
            const command = parts.slice(5).join(" ");
            log(`Scheduling ${command} to run on ${schedule}`, "info");
            cron.schedule(schedule, () => {
                log(`Running ${command}`, "info");
                const { exec } = child_process;
                exec(command, (err, stdout, stderr) => {
                    if (err) {
                        log(err.toString(), "error");
                        return;
                    }
                    log(stdout);
                });
            });
        } catch (e) {
            log(e.toString(), "error");
        }
    });
}

main().catch(console.error);

// Watch for changes in the cron file
fs.watch(cronPath, async (event, filename) => {
    log(`Cron file ${filename} changed. Reloading...`, "info");
    main().catch(console.error);
});