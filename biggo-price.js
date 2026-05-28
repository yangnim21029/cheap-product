// BigGo 台灣多平台價格查詢工具 - 用 WebFetch 從 biggo.com.tw 抓二手/新品 price stats
// 用法: node biggo-price.js "Sony WH-1000XM5"
// 或加 二手 suffix: node biggo-price.js "Sony WH-1000XM5" 二手
//
// BigGo 比 subagent 自由 search 結構化 — 同時抓 蝦皮/Yahoo/露天/旋轉/PChome 等多平台

const { execSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node biggo-price.js "<product query>" [二手|new]');
  console.error('例: node biggo-price.js "Sony WH-1000XM5" 二手');
  process.exit(1);
}

const query = args.join(' ');
const url = `https://biggo.com.tw/s/${encodeURIComponent(query)}/`;

console.log(`查詢: ${query}`);
console.log(`URL: ${url}`);
console.log('---');
console.log('使用方式: Claude WebFetch 帶這個 URL + prompt:');
console.log('');
console.log('"List all listings with prices. Group by marketplace (蝦皮/Yahoo拍賣/露天/旋轉/PChome).');
console.log(' Output: count, min, max, median, mode (most common range). Mark Carousell/旋轉 distinctly."');
console.log('');
console.log('或在 code 內呼叫 WebFetch tool 直接拿結構化結果');
