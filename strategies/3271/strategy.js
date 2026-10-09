/*
 * @coinsori-strategy v1
 * name: BTC Mean Reversion RSI-BB
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC mean-reverts on daily timeframes — sharp drops to the lower Bollinger band
 * with oversold RSI tend to bounce. Betting on that bounce with a hard stop.
 * When it buys and sells: buys when price closes below the lower BB(20,2) AND RSI(14)<30.
 * Sells when price closes back above the middle band (SMA20), or RSI>60, or hits a 1.5xATR hard stop.
 * When it does NOT work: prolonged bear markets where every dip is met with more selling —
 * mean reversion catches falling knives. Also underperforms in strong one-way trends.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);        // previous closed bar
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const mid = ctx.sma(20, 1);
  const prevClose = ctx.closes.at(-2);
  if (bb == null || rsi == null || atr == null || mid == null || prevClose == null) return null;

  const pos = ctx.position;

  if (pos > 0) {
    const stop = ctx.entryPx - 1.5 * atr;   // hard stop: 1.5xATR below entry, limits knife risk
    const exitMid = prevClose > mid;        // mean reversion target: back to middle band
    const exitRsi = rsi > 60;               // overbought close-out
    ctx.watch([
      { side: 'sell', price: mid, trigger: 'above', note: 'mid-band target', conds: [{ label: 'RSI(14)', now: rsi, op: '>', ref: 60, closed: true }] },
      { side: 'sell', price: stop, trigger: 'below', note: '1.5xATR hard stop' }
    ]);
    if (exitMid || exitRsi || prevClose < stop) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // entry: closed bar below lower band AND oversold RSI — both must hold
  if (prevClose < bb.lower && rsi < 30) {
    const qty = ctx.cash / ctx.price * 0.99;   // full position, hard stop caps downside
    ctx.watch([{ side: 'buy', price: bb.lower, trigger: 'below', note: 'BB lower touch', conds: [{ label: 'RSI(14) close', now: rsi, op: '<', ref: 30, closed: true }] }]);
    return { side: 'buy', qty };
  }
  ctx.watch([{ side: 'buy', price: bb.lower, trigger: 'below', note: 'BB lower touch', conds: [{ label: 'RSI(14) close', now: rsi, op: '<', ref: 30, closed: true }] }]);
  return null;
}
