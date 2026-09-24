/*
 * @coinsori-strategy v1
 * name: ETH Band-Bounce Mean Reversion 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A different family from trend-following. Crypto often snaps back
 * to its average after sharp oversold dips, so buying at the lower Bollinger band and
 * selling at the middle band captures the bounce. It profits in chop where trend
 * strategies lose, diversifying the portfolio.
 * When it buys and sells: Buy when the last closed price is at or below the lower
 * Bollinger band AND RSI is oversold (<40). Very deep fear dips (RSI<25) are bought
 * even in a downtrend. Sell when price closes back at the middle band (SMA20), or cut
 * losses if price keeps falling (stop below entry).
 * When it does NOT work: In strong one-way trends price keeps falling through the
 * lower band and the stop takes repeated small losses; it also sits in cash a lot, so
 * it underperforms in long bull runs. It is a chop strategy, not a trend strategy.
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
    if (cash <= 0 || ctx.price <= 0) return null;
    const atBand = px <= lower;
    const oversold = rsi < 40;
    const deepFear = rsi < 25; // buy even in a downtrend if truly washed out
    const uptrend = px > sma200;
    if (atBand && oversold && (uptrend || deepFear)) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  const revert = px >= mid;
  const stop = ctx.entryPx != null && px < ctx.entryPx - 2.5 * atr;
  if (revert || stop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
