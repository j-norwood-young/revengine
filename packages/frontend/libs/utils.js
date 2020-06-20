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

const htmlEntities = (str) => {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

const bytesToString = (bytes, precision) => {
    if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
    if (bytes === 0) {
        return "0B";
    }
    if (typeof precision === 'undefined') precision = 1;
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'],
        number = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + units[number];
};

const imgResize = (img, w, h) => {
    img = img.replace(/[^a-z0-9./_-]/gi, '');
    return "/image/resize/" + encodeURIComponent(img) + "/" + parseInt(w) + "/" + parseInt(h);
};

const imgContain = (img, w, h) => {
    img = img.replace(/[^a-z0-9./_-]/gi, '');
    return "/image/contain/" + encodeURIComponent(img) + "/" + parseInt(w) + "/" + parseInt(h);
};

const parser = (domstring) => {
    let html = new DOMParser().parseFromString(domstring, 'text/html');
    return Array.from(html.body.childNodes);
};

const isEmpty = function () {
    for (var key in this) {
        if (this.hasOwnProperty(key))
            return false;
    }
    return true;
}

module.exports = { formatNumber, htmlEntities, bytesToString, imgContain, imgResize, parser, isEmpty };