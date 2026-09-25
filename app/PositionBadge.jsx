import {valuation} from '../lib/engine.mjs';
export default function PositionBadge({symbol,account}){
 if(!account)return <span className="tag">持仓读取中</span>;
 const value=valuation(account,account.data),p=value.positions.find(p=>p.symbol===symbol&&p.quantity!==0);
 const multiple=p&&value.equity>0?Math.abs(p.marketValue)/value.equity:null;
 const pending=account.orders.filter(o=>o.symbol===symbol&&o.status==='PENDING');
 return <div className="position-badges"><span title="仓位 = 该持仓人民币市值绝对值 ÷ 日线账本净资产。账户整体杠杆在总览上方显示。" className={'tag '+(p?(p.quantity<0?'short-position':'green'):'')}>{p?(p.quantity<0?'↓ 做空':'↑ 做多'):'未持仓'}{p&&' · 仓位 '+(multiple==null?'暂不可算':(multiple*100).toFixed(1)+'%')}</span>{p&&<small className="muted">占账户净资产{value.complete?'':' · 估值待核验'}</small>}{pending.map(o=><small key={o.id} className="pending-direction">{({BUY:'待买入 · 未成交',SHORT:'待做空 · 未成交',SELL:'待卖出平多',COVER:'待买入平空'}[o.side])||'待执行'}</small>)}</div>;
}
