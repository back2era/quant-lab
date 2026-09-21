export default function PositionBadge({symbol,account}){
 if(!account)return <span className="tag">持仓读取中</span>;
 const p=account.positions.find(p=>p.symbol===symbol&&p.quantity!==0);
 const pending=account.orders.filter(o=>o.symbol===symbol&&o.status==='PENDING');
 return <div className="position-badges"><span className={'tag '+(p?(p.quantity<0?'short-position':'green'):'')}>{p?(p.quantity<0?'↓ 做空':'↑ 做多'):'未持仓'}</span>{pending.map(o=><small key={o.id} className="pending-direction">{({BUY:'待买入 · 未成交',SHORT:'待做空 · 未成交',SELL:'待卖出平多',COVER:'待买入平空'}[o.side])||'待执行'}</small>)}</div>;
}
