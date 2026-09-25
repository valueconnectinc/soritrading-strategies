/*
 * @coinsori-strategy v1
 * name: AVAX 4H Band-Bounce Generalization Test
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Generalization test of the validated band-bounce mean-reversion
 *   champion (confirmed on LTC/XRP/DOT/BNB/ADA) on a NEW untested asset, AVAX 4H.
 *   The exact champion recipe is copied unchanged — no threshold tuning — to see
 *   whether the defensive edge transfers to another mid-cap alt.
 * When it buys and sells: Buy when the close is below the lower Bollinger(20,2) band
 *   AND RSI(2) is deeply oversold, with a 5-bar cooldown after each exit. Sell when
 *   price recovers to the 20-SMA or RSI climbs above 55. A 6% hard stop caps damage.
 * When it does NOT work: In a sustained downtrend it re-buys falling knives; in fast
 *   melt-ups it exits too early and misses the rally. It is defensive by design and
 *   lags strong bulls. High-momentum assets (SOL/ETH) have shown a noisier edge.
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
