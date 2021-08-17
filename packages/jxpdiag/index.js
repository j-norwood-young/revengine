const apihelper = require("@revengine/common/apihelper");
const { Command } = require('commander');
const program = new Command();
const fs = require("fs").promises;

program
.option('-o, --output <file>', 'output to file')
.option('-d, --dump', 'dump')
.option('-e --exclude', 'exclude fields starting with _')

program.parse(process.argv);
const options = program.opts();

const generate_dbml = async () => {
    const models = await apihelper.models();
    const tablestrings = [];
    const refs = [];
    for (let model of models) {
        let s = `Table ${model.model} {\n`;
        const schema = await apihelper.model(model.model);
        let keys = Object.keys(schema);
        if (options.exclude) {
            keys = keys.filter(key => key === "_id" || key.slice(0,1) !== "_")
        }
        keys.sort();
        for (let param of keys) {
            const param_name = param.replace(/[\.\-]/g, "_");
            s += `   ${param_name} ${schema[param].instance}${param === "_id" ? " [pk]" : ""}\n`
            if (schema[param].options.link) {
                const ref = `Ref: ${model.model}.${param_name} > ${schema[param].options.map_to || schema[param].options.link}._id`;
                // if (!schema[param].options.map_to) {
                //     console.log(schema[param].options)
                // }
                refs.push(ref);
            }
            // console.log(param, schema[param])
        }
        s += `}`
        tablestrings.push(s);
    }
    return [...tablestrings, ...refs].join("\n\n");
}

const main = async () => {
    const dbml = await generate_dbml();
    if (options.output) {
        console.log(options.output)
        await fs.writeFile(options.output, dbml);
    }
    if (options.dump) {
        console.log(dbml);
    }

}

main();