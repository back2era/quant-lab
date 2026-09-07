import { parseFundamentals } from './engine.mjs';
export const UNIVERSE=[
 {symbol:'MSFT',name:'微软',market:'US',currency:'USD',lot:1,cik:'0000789019',sector:'云计算 / 企业软件',thesis:'观察 Azure、企业软件订阅与AI资本开支的现金回报。',risk:'AI投入高企，云业务竞争与估值压缩。'},
 {symbol:'NVDA',name:'英伟达',market:'US',currency:'USD',lot:1,cik:'0001045810',sector:'AI / 半导体',thesis:'观察数据中心算力需求、毛利率与客户集中度。',risk:'出口限制、客户自研芯片与周期性需求。'},
 {symbol:'GOOGL',name:'谷歌',market:'US',currency:'USD',lot:1,cik:'0001652044',sector:'互联网 / 云计算',thesis:'观察广告现金流、云业务利润及AI搜索商业化。',risk:'搜索替代、反垄断与资本开支。'},
 {symbol:'AMZN',name:'亚马逊',market:'US',currency:'USD',lot:1,cik:'0001018724',sector:'电商 / 云计算',thesis:'观察AWS增长、零售经营利润和自由现金流。',risk:'云竞争、消费周期和履约成本。'},
 {symbol:'600519.SS',name:'贵州茅台',market:'A',currency:'CNY',lot:100,sector:'消费 / 白酒',thesis:'待核验批价、渠道库存与经营现金流。',risk:'消费疲软、渠道库存及估值变化。'},
 {symbol:'600036.SS',name:'招商银行',market:'A',currency:'CNY',lot:100,sector:'金融 / 银行',thesis:'待核验息差、资产质量与股息覆盖。',risk:'信用损失、息差压力及房地产敞口。'},
 {symbol:'300750.SZ',name:'宁德时代',market:'A',currency:'CNY',lot:100,sector:'新能源 / 电池',thesis:'待核验储能需求、产能利用率与现金回款。',risk:'价格竞争、原料波动及海外政策。'},
 {symbol:'0700.HK',name:'腾讯控股',market:'HK',currency:'HKD',lot:100,sector:'互联网 / 游戏',thesis:'待核验游戏、广告增长与股东回报。',risk:'监管、产品周期与宏观需求。'},
 {symbol:'9988.HK',name:'阿里巴巴',market:'HK',currency:'HKD',lot:100,sector:'电商 / 云计算',thesis:'待核验云业务盈利、电商竞争与自由现金流。',risk:'竞争加剧、投入增加及需求变化。'},
 {symbol:'1211.HK',name:'比亚迪股份',market:'HK',currency:'HKD',lot:500,sector:'新能源 / 汽车',thesis:'待核验海外销量、单车利润和营运资本。',risk:'价格战、关税与产能投入。'},
 {symbol:'BTC-USD',name:'比特币',market:'CRYPTO',currency:'USD',lot:0.00001,sector:'数字资产 / BTC',thesis:'独立趋势模型；观察价格动量与波动，不使用财报评分。',risk:'高波动、流动性冲击及监管变化。'},
 {symbol:'ETH-USD',name:'以太坊',market:'CRYPTO',currency:'USD',lot:0.0001,sector:'数字资产 / ETH',thesis:'独立趋势模型；链上基本面尚未接入，评分仅反映趋势。',risk:'网络竞争、协议风险与高波动。'},
];
export const BENCHMARKS=[{symbol:'SPY',name:'标普500 ETF',market:'US',currency:'USD',weight:0.6},{symbol:'510300.SS',name:'沪深300 ETF',market:'A',currency:'CNY',weight:0.3},{symbol:'BTC-USD',name:'比特币',market:'CRYPTO',currency:'USD',weight:0.1}];
const headers={'User-Agent':'GuanlanPaperResearch/1.0 (personal paper trading research)'};
async function json(url){const res=await fetch(url,{headers,signal:AbortSignal.timeout(18000)});if(!res.ok)throw new Error('数据源返回 HTTP '+res.status);return res.json();}
export function parseChart(result,spec,now){
 const chart=result.chart?.result?.[0];if(!chart)throw new Error('行情结构无效');if(chart.meta.currency!==spec.currency)throw new Error('报价币种不匹配');
 const q=chart.indicators.quote[0];const hours=spec.market==='CRYPTO'?24:spec.market==='A'?5.5:6.5;
 const bars=(chart.timestamp||[]).map((t,i)=>({openAt:new Date(t*1000).toISOString(),closeAt:new Date((t+hours*3600)*1000).toISOString(),close:q.close[i],volume:q.volume[i]||0})).filter(b=>b.close>0&&Date.parse(b.closeAt)+300000<=Date.parse(now));
 if(!bars.length)throw new Error('没有已收盘日线');const last=bars.at(-1);const prices=bars.map(x=>x.close);const changes=prices.slice(-64).slice(1).map((p,i)=>Math.log(p/prices.slice(-64)[i]));const avg=changes.reduce((s,x)=>s+x,0)/(changes.length||1);
 const actions=[...Object.values(chart.events?.splits||{}).map(a=>({type:'split',at:new Date(a.date*1000).toISOString(),ratio:a.numerator/a.denominator})),...Object.values(chart.events?.dividends||{}).map(a=>({type:'dividend',at:new Date(a.date*1000).toISOString(),amount:a.amount}))];
 return {...spec,price:last.close,quoteAt:last.closeAt,change:prices.length>1?last.close/prices.at(-2)-1:null,momentum:prices.length>=64?last.close/prices.at(-64)-1:null,ma200:prices.length>=200?prices.slice(-200).reduce((s,x)=>s+x,0)/200:null,volatility:changes.length>=30?Math.sqrt(changes.reduce((s,x)=>s+(x-avg)**2,0)/changes.length)*Math.sqrt(spec.market==='CRYPTO'?365:252):null,bars:bars.slice(-220),sparkline:prices.slice(-40),actions,source:'https://finance.yahoo.com/quote/'+encodeURIComponent(spec.symbol)+'/',fundamentals:null};
}
export async function collectData(previous=null,now=new Date().toISOString()){
 const errors=[];let fx=null;
 try{const f=await json('https://api.frankfurter.dev/v1/latest?base=USD&symbols=CNY,HKD');if(!(f.rates?.CNY>0&&f.rates?.HKD>0))throw new Error('汇率无效');fx={CNY:1,USD:f.rates.CNY,HKD:f.rates.CNY/f.rates.HKD,date:f.date,source:'https://frankfurter.dev/v1/'};}catch(e){errors.push('汇率：'+e.message);}
 const assets=[];
 // Sequential requests keep large SEC documents below the worker memory budget.
 for(const spec of UNIVERSE){let asset={...spec,price:null,quoteAt:null,bars:[],sparkline:[],fundamentals:null,source:'https://finance.yahoo.com/quote/'+encodeURIComponent(spec.symbol)+'/'};
  try{asset=parseChart(await json('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(spec.symbol)+'?range=1y&interval=1d&events=div,splits'),spec,now);}catch(e){const cached=previous?.assets?.find(a=>a.symbol===spec.symbol);if(cached?.price>0)asset={...cached,cached:true};errors.push(spec.name+' 行情：'+e.message+(cached?.price>0?'；保留原日期缓存，未产生新行情':''));}
  if(spec.cik){try{const cached=previous?.assets?.find(a=>a.symbol===spec.symbol)?.fundamentals;if(cached?.checkedAt&&Date.parse(now)-Date.parse(cached.checkedAt)<7*86400000)asset.fundamentals=cached;else {const source='https://www.sec.gov/edgar/browse/?CIK='+spec.cik;asset.fundamentals=parseFundamentals(await json('https://data.sec.gov/api/xbrl/companyfacts/CIK'+spec.cik+'.json'),now,source);}if(!asset.fundamentals)errors.push(spec.name+' 财报：未找到可比年报指标');}catch(e){errors.push(spec.name+' 财报：'+e.message);}}
  assets.push(asset);
 }
 const benchmarks=[];
 for(const spec of BENCHMARKS){try{const found=assets.find(a=>a.symbol===spec.symbol&&a.price>0);benchmarks.push(found?{...found,weight:spec.weight}:parseChart(await json('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(spec.symbol)+'?range=1y&interval=1d&events=div,splits'),spec,now));}catch(e){const cached=previous?.benchmarks?.find(a=>a.symbol===spec.symbol);if(cached)benchmarks.push({...cached,cached:true});errors.push(spec.name+' 基准：'+e.message);}}
 return {asOf:now,fx,assets,benchmarks,errors};
}
