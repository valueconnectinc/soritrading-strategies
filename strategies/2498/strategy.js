/*
 * @coinsori-strategy v1
 * name: XRP 1D Band-Bounce Oversold-Scaled
 * ex: binance
 * syms: XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion recipe (buy a deep oversold
 *   dip below the lower Bollinger band, exit on recovery) is a validated edge
 *   across XRP/LTC/DOT/BNB/ADA/ETC on 1D. The one confirmed weakness is lagging
 *   strong bull runs, and every attempt to force participation has destroyed the
 *   edge. This version does NOT force participation — instead it scales position
 *   size by HOW deep the panic is, buying more at the most extreme oversold
 *   readings where the mean-reversion edge is strongest. It still sits in cash
 *   through bull runs, but concentrates capital at the deepest dips.
 * When it buys and sells: Buy when close is below the lower Bollinger band AND
 *   RSI(2) is oversold. Position size scales up as RSI gets more extreme (deeper
 *   panic = bigger size). Sell when price recovers to the 20-SMA or RSI climbs
 *   above 55. A 6% hard stop limits single-trade damage.
 * When it does NOT work: In sustained multi-week downtrends the deep-oversold
 *   entry keeps re-buying falling knives (larger size on deeper dips makes this
 *   worse), and in fast melt-ups it exits too early and misses the rally. Mean
 *   reversion lags strong trends.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(2, 1);
  const sma = ctx.sma(20, 1);
  if (bb == null || bb.lower == null || rsi == null || sma == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // exit: recovered to the 20-SMA, RSI healthy, or hard stop
    if (price < ctx.entryPx * 0.94) return { side: 'sell', qty: pos };
    if (rsi > 55 || price > sma) return { side: 'sell', qty: pos };
    return null;
  }

  // deep oversold dip below the lower band
  if (price < bb.lower && rsi < 30) {
    // scale size by panic depth: 0.5x at RSI 25-30, up to 1.5x at RSI<15
    // deeper oversold = stronger mean-reversion signal = bigger position
    let frac = 0.98;
    if (rsi < 15) frac = 1.5;
    else if (rsi < 20) frac = 1.25;
    else if (rsi < 25) frac = 1.0;
    else frac = 0.6;
    return { side: 'buy', qty: ctx.cash / ctx.price * frac };
  }
  return null;
}
