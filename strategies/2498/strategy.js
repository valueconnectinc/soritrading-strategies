/*
 * @coinsori-strategy v1
 * name: ADA 1D Band-Bounce Mean Reversion
 * ex: binance
 * syms: ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion recipe (buy a deep
 *   oversold dip below the lower Bollinger band with RSI<30, exit on
 *   recovery) is a validated, repeatable edge on XRP/LTC/DOT/BNB at 1d.
 *   This tests whether the same recipe generalizes to ADA — a fresh asset
 *   not tuned on, to confirm the family edge is cross-symbol and not a fit.
 * When it buys and sells: Buy when the close is below the lower Bollinger
 *   band AND RSI(2) is deeply oversold. Sell when price recovers to the
 *   20-bar SMA or RSI climbs above 55. A 6% hard stop limits single-trade
 *   damage.
 * When it does NOT work: In sustained multi-week downtrends the deep-oversold
 *   entry keeps re-buying falling knives, and in fast melt-ups it exits too
 *   early and misses the rally. Mean reversion lags strong trends.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(2, 1);
  const sma = ctx.sma(20, 1);
  if (bb == null || bb.lower == null || rsi == null || sma == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price < ctx.entryPx * 0.94) return { side: 'sell', qty: pos };
    if (rsi > 55 || price > sma) return { side: 'sell', qty: pos };
    return null;
  }
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
