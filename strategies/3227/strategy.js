/*
 * @coinsori-strategy v1
 * name: Momentum Rotation 4H
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: crypto leadership rotates — the asset with the strongest recent 21-bar momentum keeps outperforming until the regime flips.
 * When it buys and sells: each symbol compares its 21-bar return against the other symbols; the leader is held, everyone else is flat. When a different symbol takes the lead, the old one is sold and the new one bought.
 * When it does NOT work: in a broad sell-off all symbols fall together, so rotation does not protect; also in a tight range where leadership flips constantly and fees eat the edge.
 */
function onUpdate(ctx) {
  const syms = ctx.syms || [ctx.sym];
  if (syms.length < 2) return null;

  const lookback = 21; // 21 bars ~ 3.5 days of 4h data: recent momentum, not ancient history
  const mom = {};
  let best = null, bestMom = -Infinity;

  for (const s of syms) {
    let closes = null;
    if (s === ctx.sym) {
      closes = ctx.closes;
    } else {
      const m = ctx.market(s);
      if (m && Array.isArray(m.closes)) closes = m.closes;
    }
    if (!closes || closes.length < lookback + 1) continue;
    const cur = closes[closes.length - 1];
    const prev = closes[closes.length - (lookback + 1)];
    if (cur == null || prev == null || prev === 0) continue;
    mom[s] = cur / prev - 1;
    if (mom[s] > bestMom) { bestMom = mom[s]; best = s; }
  }
  if (!best) return null;

  if (ctx.sym === best) {
    if (ctx.position <= 0) {
      return { side: 'buy', qty: (ctx.cash * 0.98) / ctx.price };
    }
    return null;
  }
  if (ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
