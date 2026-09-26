/*
 * @coinsori-strategy v1
 * name: Bollinger Squeeze Breakout BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Volatility-expansion family, distinct from both the
 * Donchian trend-follower and the Bollinger mean-reversion. Periods of
 * compressed volatility (narrow Bollinger bands) are often followed by a
 * directional breakout. Buying the squeeze-breakout in the direction of the
 * longer-term trend captures the expansion move.
 * When it buys and sells: buys when the Bollinger band width is in its lowest
 * quartile (squeeze) AND price closes above the 20-period upper band (upward
 * breakout) while price is above the 200-day SMA (bull regime); exits on a
 * 3x-ATR stop or when price falls back below the middle band (expansion done).
 * When it does NOT work: in a sideways chop the squeeze-breakout whipsaws
 * (false breakouts); in a bear market below the 200-SMA it never buys and
 * sits in cash; breakouts that immediately reverse lose on the stop.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || sma200 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const bandWidth = (bb.upper - bb.lower) / bb.mid;

  if (pos > 0) {
    // Exit on a 3x-ATR stop, or when price falls back below the middle band
    // (the expansion has completed / reversed).
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (price < bb.mid) return { side: 'sell', qty: pos };
    return null;
  }

  // Only take squeeze-breakouts in a confirmed bull (above 200-SMA).
  if (price < sma200) return null;

  // Squeeze: band width below its recent average (compressed volatility).
  // Use a 50-bar rolling mean of band width as the "normal" reference.
  let widthSum = 0, widthCount = 0;
  for (let ago = 1; ago <= 50; ago++) {
    const b = ctx.bb(20, 2, ago);
    if (b == null) continue;
    widthSum += (b.upper - b.lower) / b.mid;
    widthCount++;
  }
  if (widthCount < 30) return null;
  const avgWidth = widthSum / widthCount;
  const isSqueeze = bandWidth < avgWidth * 0.8;

  // Upward breakout: close above the upper band while in a squeeze, bull regime.
  if (isSqueeze && price > bb.upper) {
    const size = Math.min(0.95, 0.03 / (atr / price));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
