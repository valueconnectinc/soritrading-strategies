/*
 * @coinsori-strategy v1
 * name: BTC Funding Contrarian
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC funding rate measures who is crowded. Deeply negative funding means shorts
 * are paying longs to hold — a crowded short that often gets squeezed. Deeply positive funding means
 * longs are crowded and the move is over-extended.
 * When it buys and sells: buys when the 7-day average funding rate is negative enough to signal
 * crowded shorts, and sells when it turns strongly positive (crowded longs) or on a 2xATR hard stop.
 * When it does NOT work: quiet markets where funding stays near neutral and never signals; and
 * prolonged one-way bull markets where funding stays positive and the strategy stays in cash.
 */
function onUpdate(ctx) {
  const f = ctx.funding;
  if (f == null) return null;          // no funding data on this venue/interval -> never trade

  // rolling 7-day funding history kept in persistent state
  ctx.state = ctx.state || {};
  const st = ctx.state;
  st.funds = st.funds || [];
  st.funds.push(f);
  if (st.funds.length > 7) st.funds.shift();
  if (st.funds.length < 7) return null;   // need a full window before judging

  const avg = st.funds.reduce((a, b) => a + b, 0) / st.funds.length;
  const atr = ctx.atr(14, 1);
  const prevClose = ctx.closes.at(-2);
  if (atr == null || prevClose == null) return null;

  const pos = ctx.position;

  if (pos > 0) {
    // exit: longs crowded again (funding strongly positive) or hard stop
    const stop = ctx.entryPx - 2 * atr;
    ctx.watch([
      { side: 'sell', price: stop, trigger: 'below', note: '2xATR hard stop' },
      { side: 'sell', note: 'funding avg > +0.0003', conds: [{ label: '7d avg funding', now: avg, op: '>', ref: 0.0003, closed: true }] }
    ]);
    if (avg > 0.0003 || prevClose < stop) return { side: 'sell', qty: pos };
    return null;
  }

  // buy: shorts are crowded (deeply negative funding)
  if (avg < -0.0001) {
    ctx.watch([{ side: 'buy', note: 'funding avg < -0.0001', conds: [{ label: '7d avg funding', now: avg, op: '<', ref: -0.0001, closed: true }] }]);
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
