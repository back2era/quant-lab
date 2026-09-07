import { writeFile } from 'node:fs/promises';
import { collectData } from '../lib/data.mjs';
import { scoreAsset } from '../lib/engine.mjs';
const data=await collectData();
await writeFile(new URL('../lib/seed.json',import.meta.url),JSON.stringify(data));
console.log(JSON.stringify({asOf:data.asOf,fx:data.fx,assets:data.assets.map(a=>({symbol:a.symbol,price:a.price,quoteAt:a.quoteAt,financials:!!a.fundamentals,score:scoreAsset(a,data.asOf).score})),errors:data.errors},null,2));
