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
 * When it buys and sells: buys when price closes below the lower BB(20,2), RSI(14)<30, AND price is
 * still above the 200-day SMA (a pullback within an uptrend, not a falling knife). Sells when price
 * closes back above the middle band (SMA20), or RSI>60, or hits a 1.5xATR hard stop.
 * When it does NOT work: prolonged bear markets below the 200-day SMA (the trend filter keeps it in
 * cash, so it simply misses, but never catches knives); strong one-way trends where dips keep falling.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);        // previous closed bar
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const mid = ctx.sma(20, 1);
  const trend = ctx.sma(200, 1);      // long-term trend gate
  const prevClose = ctx.closes.at(-2);
  if (bb == null || rsi == null || atr == null || mid == null || trend == null || prevClose == null) return null;

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

  // entry: pullback in an UPTREND (price above 200d SMA) — avoid catching falling knives
  if (prevClose > trend && prevClose < bb.lower && rsi < 30) {
    const qty = ctx.cash / ctx.price * 0.99;
    ctx.watch([{ side: 'buy', price: bb.lower, trigger: 'below', note: 'BB lower in uptrend', conds: [{ label: 'RSI(14) close', now: rsi, op: '<', ref: 30, closed: true }, { label: 'Above 200d SMA', ok: true }] }]);
    return { side: 'buy', qty };
  }
  return null;
}
