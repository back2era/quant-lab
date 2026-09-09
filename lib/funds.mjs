export const FUNDS=[
 {symbol:'SPY',name:'SPDR 标普500 ETF',index:'标普500',fundSource:'https://www.ssga.com/us/en/individual/etfs/spdr-sp-500-etf-trust-spy'},
 {symbol:'QQQ',name:'Invesco 纳斯达克100 ETF',index:'纳斯达克100',fundSource:'https://www.invesco.com/qqq-etf/en/home.html'},
 {symbol:'VTI',name:'Vanguard 美国全市场 ETF',index:'美国股票全市场',fundSource:'https://investor.vanguard.com/investment-products/etfs/profile/vti'},
].map(f=>({...f,market:'US',currency:'USD',lot:1,kind:'ETF',sector:'指数基金 / '+f.index,thesis:'用分散指数敞口参与市场，依据200日趋势、63日动量与波动筛选。',risk:'市场整体回撤、指数集中度和汇率风险；基金费用通常反映在净值中。'}));
