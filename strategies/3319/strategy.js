/*
 * @coinsori-strategy v1
 * name: BTC On-Chain Network Pulse
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's long bull markets are driven by real network
 * growth — rising active addresses and rising hashrate. When the network is
 * expanding month over month price tends to follow; when it contracts price
 * tends to fall. This trades the fundamentals instead of price.
 * When it buys and sells: buys when both the 30-day average active addresses
 * and the 30-day average hashrate are above their level 30 days ago (network
 * expanding); sells when either falls back below. Long-only, very few trades.
 * When it does NOT work: on-chain metrics turn over slowly, so it exits late
 * at tops and re-enters late at bottoms; in a long flat period with no real
 * network growth it stays out and misses the rally. It never shorts.
 */
function onUpdate(ctx) {
  const a = ctx.data('addr_sma30'); // 30d avg active addresses
  const h = ctx.data('hashrate_sma30'); // 30d avg hashrate
  if (a == null || h == null) return null;

  const st = ctx.state;
  if (!st.aHist) st.aHist = [];
  if (!st.hHist) st.hHist = [];
  st.aHist.push(a);
  st.hHist.push(h);
  if (st.aHist.length > 31) st.aHist.shift();
  if (st.hHist.length > 31) st.hHist.shift();
  if (st.aHist.length < 31 || st.hHist.length < 31) return null; // need 30 daily bars

  const aPrev = st.aHist[0]; // value 30 days ago
  const hPrev = st.hHist[0];
  if (aPrev <= 0 || hPrev <= 0) return null; // guard early near-zero data
  const expanding = a > aPrev && h > hPrev; // both metrics growing = network expanding

  if (ctx.position <= 0) {
    if (expanding) {
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.95 };
    }
    ctx.watch([{ side: 'buy', price: ctx.price, trigger: 'above', note: 'network expanding', conds: [
      { label: 'addr 30d vs 30d ago', now: a / aPrev, op: '>', ref: 1 },
      { label: 'hash 30d vs 30d ago', now: h / hPrev, op: '>', ref: 1 }
    ]}]);
    return null;
  }

  // Hard stop -30% from entry: on-chain metrics turn over slowly, so a crash can
  // start well before they roll over. 30% is past most bull pullbacks but caps
  // the worst of a real bear.
  if (ctx.entryPx != null && ctx.price < ctx.entryPx * 0.70) {
    return { side: 'sell', qty: ctx.position };
  }

  if (!expanding) {
    return { side: 'sell', qty: ctx.position };
  }
  ctx.watch([{ side: 'sell', price: ctx.entryPx != null ? ctx.entryPx * 0.70 : ctx.price, trigger: 'below', note: 'hard stop -30%' }]);
  return null;
}
