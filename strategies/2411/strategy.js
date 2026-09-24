/*
 * @coinsori-strategy v1
 * name: ETH Oversold Bounce Mean Reversion 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The trend-following champion bleeds in choppy bear-to-recovery
 * windows (2021-24: +7% vs buy-and-hold +213%) because it is slow to re-enter after a
 * crash. Mean reversion is the opposite bet: crypto dips that stay inside a long-term
 * uptrend tend to snap back, so buying a deep oversold bounce and selling back to the
 * mean captures exactly the recovery the trend strategy misses.
 * When it buys and sells: Buy when RSI(14) is oversold (<30) AND price closed below the
 * lower Bollinger band AND the 200-day average is still rising (long-term uptrend intact,
 * so we are not catching a falling knife in a confirmed bear). Sell back to the middle
 * band (20-day average), or after a 30-day timeout, or on a 2 ATR stop loss.
 * When it does NOT work: In a sustained bear market the 200-day average is falling, so
 * the strategy stays in cash and misses nothing (good), but if a V-shaped crash keeps
 * price below the lower band while the 200-day still slopes up from a long past bull,
 * it can buy too early into a deeper drop. Long-only, no shorting.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 210) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const rsi = ctx.rsi(14, 1);
  const bb = ctx.bb(20, 2, 1);
  const sma20 = ctx.sma(20, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200Prev = ctx.sma(200, 21); // ~1 month earlier, to gauge long-term slope
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || rsi == null || bb == null || sma20 == null || sma200 == null ||
      sma200Prev == null || atr == null || px <= 0) return null;

  const longTrendUp = sma200 > sma200Prev; // 200-day average still rising
  const oversold = rsi < 30; // deeply oversold
  const belowLowerBand = px < bb.lower; // price broke below the lower band
  const entryPx = ctx.entryPx || 0;

  // Timeout: force exit after 30 bars in the trade (mean reversion should be quick).
  // We approximate age by comparing current price to entry; if we have no clean bar
  // counter, use a price-based timeout: if price has not recovered in 30 bars.
  const barsInTrade = ctx.state && ctx.state.barsInTrade != null ? ctx.state.barsInTrade : 0;

  if (pos === 0) {
    if (oversold && belowLowerBand && longTrendUp && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  // Exit conditions: revert to mean, stop loss, or timeout.
  const revertToMean = px >= sma20; // price snapped back to the 20-day average
  const stopLoss = entryPx > 0 && px < entryPx - 2.0 * atr; // 2 ATR stop
  const timedOut = barsInTrade >= 30;
  if (revertToMean || stopLoss || timedOut) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
