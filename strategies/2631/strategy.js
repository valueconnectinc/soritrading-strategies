/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion UNI 4H
 * ex: binance
 * syms: UNIUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean-reversion family, complementary to trend-following.
 * UNI 4h regularly overreacts to the downside, touching the lower Bollinger
 * band, then snaps back to the mean. Buying that panic-bottom and selling
 * back to the middle captures the snap-back. This is the confirmed band-bounce
 * recipe (works on LTC/XRP/DOT/BNB/ADA/AVAX/LINK/DOGE 4h). UNI is a fresh
 * asset for this family — a genuine out-of-sample test.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * band with RSI<30 (panic), only when price is above the 200-period SMA (don't
 * catch knives in a downtrend); exits at the middle band / RSI>50 or a stop.
 * When it does NOT work: lags strong melt-ups (sits in cash during rallies);
 * in a sustained downtrend below the 200-SMA it never buys; a panic that keeps
 * falling still loses. Mean reversion is defensive, not a trend rider.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Exit when price recovers to the middle band or RSI turns neutral/bullish.
    if (price >= bb.mid || rsi > 50) return { side: 'sell', qty: pos };
    // Hard stop to cap a panic that keeps falling.
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) return { side: 'sell', qty: pos };
    return null;
  }

  // Only buy panic-bottoms when the long-term trend is intact (above 200-SMA),
  // so we catch oversold dips in an uptrend, not falling knives in a downtrend.
  if (price < sma200) return null;

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
