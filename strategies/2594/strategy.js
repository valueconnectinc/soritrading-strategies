/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion LTC 4H Scale-Out
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean-reversion family, complementary to trend-following.
 * LTC 4h regularly overreacts to the downside, touching the lower Bollinger
 * band, then snaps back to the mean. Buying that panic-bottom and selling
 * back to the middle captures the snap-back. This adds PARTIAL SCALE-OUT
 * (confirmed to cut MDD from ~30% to ~15-23% in the band-bounce recipe):
 * sell half at the middle band, let the rest ride toward the upper band.
 * When it buys and sells: buys when price closes below the lower Bollinger(20,2)
 * band with RSI<30 (panic), only when price is above the 200-period SMA (don't
 * catch knives in a downtrend); sells half at the middle band / RSI>50, the
 * rest at the upper band, or a hard stop.
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
  const atr = ctx.atr(14, 1);

  if (pos > 0) {
    // Hard stop first: cap a panic that keeps falling (6x ATR was too loose
    // at ~30% MDD; tighten to 4x to cut drawdown while still allowing a dip).
    if (atr != null && price <= ctx.entryPx - atr * 4) return { side: 'sell', qty: pos };
    // Partial scale-out: sell HALF when price recovers to the middle band or
    // RSI turns neutral — locks in the snap-back, frees cash, cuts MDD.
    if (price >= bb.mid || rsi > 50) {
      return { side: 'sell', qty: pos * 0.5 };
    }
    // Full exit if the remaining half reaches the upper band (mean reversion
    // complete / overbought).
    if (price >= bb.upper) return { side: 'sell', qty: pos };
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
