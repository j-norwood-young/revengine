const formatNumber = (num, dec) => {
    if (dec === null)
        dec = 2;
    var n = 0;
    if (!isNaN(parseFloat(num)) && isFinite(num)) {
        num = num.toFixed(dec);
        n = num.toString().split(/(?=(?:\d{3})+(?:\.|$))/g).join(",");
    }
    return n;
};

export default formatNumber;