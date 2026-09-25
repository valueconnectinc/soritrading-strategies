/*
 * @coinsori-strategy v1
 * name: BTC 4H Band-Bounce Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Test whether the mean-reversion band-bounce recipe that already
 *   made money on LTC/DOT/BNB 4h also works on BTC 4h — a genuinely different family
 *   from the EMA trend champion, and a potential diversifier.
 * When it buys and sells: Buy when price closes below the lower Bollinger band AND RSI
 *   is oversold (<30). Exit when price climbs back above the 20-period SMA or RSI
 *   recovers above 50. A 6% stop protects against falling knives.
 * When it does NOT work: Strong one-way bull markets (it sits in cash during melt-ups)
 *   and violent downtrends where oversold stays oversold. Mean reversion is defensive,
 *   not a trend rider.
 */
function onUpdate(ctx) {
  // --- trend gate: only buy in an uptrend-ish regime so we don't catch knives in bears
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const price = ctx.price;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma20 = ctx.sma(20, 1);
  if (bb == null || rsi == null || sma20 == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    // exit: back above SMA20, RSI recovered, or stop hit
    if (price < sma20 || rsi > 50 || ctx.uPnl < -0.06 * ctx.entryPx * pos) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // entry: oversold touch of lower band, only when price is above the 200-SMA (bull bias)
  if (price > sma200 && price <= bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
