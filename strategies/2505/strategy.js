/*
 * @coinsori-strategy v1
 * name: LINK 4H Band-Bounce Generalization Test
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Second generalization test of the validated band-bounce
 *   mean-reversion champion (confirmed on LTC/XRP/DOT/BNB/ADA/AVAX) on another
 *   NEW untested asset, LINK 4H. Exact champion recipe copied unchanged — no
 *   tuning — to see if the defensive edge also transfers to LINK.
 * When it buys and sells: Buy when the close is below the lower Bollinger(20,2)
 *   band AND RSI(2) is deeply oversold, with a 5-bar cooldown after each exit.
 *   Sell when price recovers to the 20-SMA or RSI climbs above 55. A 6% hard stop.
 * When it does NOT work: In a sustained downtrend it re-buys falling knives; in
 *   fast melt-ups it exits too early and misses the rally. Defensive by design.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(2, 1);
  const sma = ctx.sma(20, 1);
  if (bb == null || bb.lower == null || rsi == null || sma == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  const lastExit = ctx.state.lastExit || -9999;
  const cooldownOk = (ctx.i - lastExit) >= 5;

  if (pos > 0) {
    if (price < ctx.entryPx * 0.94) return { side: 'sell', qty: pos };
    if (price >= sma || rsi > 55) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price < bb.lower && rsi < 30 && cooldownOk) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
