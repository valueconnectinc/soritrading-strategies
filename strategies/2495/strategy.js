/*
 * @coinsori-strategy v1
 * name: DOT 1D Band-Bounce Mean Reversion
 * ex: binance
 * syms: DOTUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same validated band-bounce mean-reversion recipe as XRP/LTC
 *   1D — buy deep oversold dips below the lower Bollinger band, exit on recovery.
 *   This is a down-market defender: it protects capital in flat/bear regimes and
 *   beats buy-and-hold there, at the cost of lagging strong bull runs.
 * When it buys and sells: Buy when close is below lower BB(20,2) AND RSI(2)<30.
 *   Sell on recovery to the 20-SMA / RSI>55, or a 6% hard stop.
 * When it does NOT work: Sustained multi-week bull runs (stays in cash waiting for
 *   dips that never come) and fast melt-ups (exits too early). Mean reversion
 *   lags strong trends by design.
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
