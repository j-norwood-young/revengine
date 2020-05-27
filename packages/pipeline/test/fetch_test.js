var chai = require('chai');
var should = chai.should();

const pipeline = require("../libs/pipeline");
const { expect, assert } = require('chai');

describe("$fetch metadata", () => {
    it("should fetch page count from https://reqres.in/api/users", (done) => {
        const def = [
            {
                action: "fetch",
                instructions: {
                    request: "https://reqres.in/api/users",
                    transform: (d) => { return  { page_count: d.total_pages } },
                    is_meta: true
                }
            },
            // {
            //     action: "log",
            //     instructions: {}
            // },
            // {
            //     action: "end",
            //     instructions: {}
            // },
        ];
        pipeline(def).then(result => {
            console.log({ result });
            expect(result[0]).to.have.property("page_count", 2);
            done();
        }).catch(err => {
            done(err);
        })
        
    });
});