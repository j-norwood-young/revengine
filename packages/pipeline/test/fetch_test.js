var chai = require('chai');
var should = chai.should();

const StreamRunner = require("../libs/streamrunner");
const { expect, assert } = require('chai');

describe("All in one pipeline", () => {
    it("should fetch list of pages from https://reqres.in/api/users", (done) => {
        const pipeline = [
            {
                action: "fetch",
                instructions: {
                    request: d => {
                        return "https://reqres.in/api/users"
                    },
                    parse: self => {
                        return self.data.json();
                    },
                    transform: async self => {
                        let urls = [];
                        for (let x = 0; x < self.data.total_pages; x++) {
                            urls.push(`https://reqres.in/api/users?page=${x + 1}`);
                        }
                        let result = [];
                        for (let url of urls) {
                            result = result.concat(await self.next(url));
                        }
                        return result;
                    }
                }
            }, 
            {
                action: "fetch",
                instructions: {
                    request: self => {
                        return self.data;
                    },
                    parse: self => {
                        return self.data.json();
                    },
                    transform: async self => {
                        let result = [];
                        for (let item of self.data.data) {
                            result.push(item);
                        }
                        return result;
                    },
                }
            },
            {
                action: "map",
                instructions: d => {
                    d.first_name = d.first_name.toUpperCase();
                    return d;
                }
            },
            {
                action: "log"
            }
        ]
        StreamRunner(pipeline).then(result => {
            expect(result).to.be.an("array").with.length(12);
            expect(result[0]).to.eql({
                id: 1,
                email: 'george.bluth@reqres.in',
                first_name: 'GEORGE',
                last_name: 'Bluth',
                avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/calebogden/128.jpg'
            });
            done();
        }).catch(err => {
            console.error({ err });
            done(err);
        })
    });
});