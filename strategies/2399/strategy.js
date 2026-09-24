/*
 * @coinsori-strategy v1
 * name: ETH Band-Bounce Mean Reversion 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A different family from trend-following. Crypto spends a lot of
 * time reverting to its mean, so buying sharp oversold dips at the lower Bollinger
 * band and selling when price snaps back to the middle band can capture the bounce.
 * This profits in chop and ranges where the trend champion loses, so it diversifies.
 * When it buys and sells: Buy when the last closed price touches the lower Bollinger
 * band AND RSI is oversold (<30). Sell when price closes back at the middle band
 * (SMA20), or cut losses if price keeps falling (stop below entry). A slow-trend
 * filter (price above its 200-day average) keeps it from catching knives in deep
 * bear markets.
 * When it does NOT work: In strong one-way trends price keeps falling past the lower
 * band and the stop takes repeated small losses; it also sits in cash most of the
 * time, so it massively underperforms in long bull runs. It is a chop strategy, not
 * a trend strategy.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 220) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || px <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || atr == null) return null;

  const lower = bb.lower;
  const mid = bb.mid;

  if (pos === 0) {
    // Only buy dips when price is still above its long-term average (not a deep bear).
    if (px > sma200 && px <= lower && rsi < 30 && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  // Exit on reversion to the middle band, or stop out if it keeps falling.
  const revert = px >= mid;
  const stop = ctx.entryPx != null && px < ctx.entryPx - 2.0 * atr;
  if (revert || stop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
