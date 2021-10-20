const content = async (params) => {
    console.log({ params })
    return JSON.stringify(params);
}

module.exports = { content }