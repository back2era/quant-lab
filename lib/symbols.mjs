export function normalizeSpec(input){
 const symbol=String(input.symbol||'').trim().toUpperCase();let market,currency,lot;
 if(/^\d{6}\.(SS|SZ)$/.test(symbol)){market='A';currency='CNY';lot=100;}
 else if(/^\d{4,5}\.HK$/.test(symbol)){market='HK';currency='HKD';lot=100;}
 else if(/^[A-Z0-9]{2,12}-USD$/.test(symbol)){market='CRYPTO';currency='USD';lot=.00001;}
 else if(/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)){market='US';currency='USD';lot=1;}
 else throw Error('代码格式无效，例如 AAPL、600000.SS、0700.HK、SOL-USD');
 return {symbol,name:String(input.name||symbol).slice(0,80),market,currency,lot,cik:market==='US'&&/^\d{10}$/.test(input.cik||'')?input.cik:undefined,sector:'扩展研究',thesis:'通过公开行情及可取得财报进行规则筛选，尚无人工核验公司结论。',risk:'公开数据可能延迟；财报、交易单位或资格不足时不自动交易。'};
}
