module.exports = (data, meta, instructions) => {
    const result = data.map(instructions.fn);
    return {data: result, meta};
}