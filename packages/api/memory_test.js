const v8 = require('v8');
// Output available memory in GBs
console.log(v8.getHeapStatistics().heap_size_limit / 1024 ** 3);