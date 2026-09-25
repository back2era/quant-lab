import {valuation} from '../lib/engine.mjs';
export default function PositionBadge({symbol,account}){
 if(!account)return <span className="tag">持仓读取中</span>;
 const value=valuation(account,account.data),p=value.positions.find(p=>p.symbol===symbol&&p.quantity!==0);
 const multiple=p&&value.equity>0?Math.abs(p.marketValue)/value.equity:null;
 const pending=account.orders.filter(o=>o.symbol===symbol&&o.status==='PENDING');
 return <div className="position-badges"><span title="该持仓人民币市值绝对值 ÷ 日线账本净资产。融资按整个账户计息，没有逐只分配保证金。" className={'tag '+(p?(p.quantity<0?'short-position':'green'):'')}>{p?(p.quantity<0?'↓ 做空':'↑ 做多'):'未持仓'}{p&&' · '+(multiple==null?'倍数不可算':multiple.toFixed(3)+'倍')}</span>{p&&<small className="muted">账户权益口径{value.complete?'':' · 估值待核验'}</small>}{pending.map(o=><small key={o.id} className="pending-direction">{({BUY:'待买入 · 未成交',SHORT:'待做空 · 未成交',SELL:'待卖出平多',COVER:'待买入平空'}[o.side])||'待执行'}</small>)}</div>;
}
