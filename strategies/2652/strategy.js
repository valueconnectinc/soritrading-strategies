/*
 * @coinsori-strategy v1
 * name: Regime-Adaptive ETH 4H (Momentum in Trend, Mean-Reversion in Chop)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto alternates between trending and chopping regimes.
 * No single signal works in both — momentum whipsaws in chop and mean-reversion
 * misses trends. This strategy detects the regime and switches its logic:
 * momentum in trends, mean-reversion in chop.
 * When it buys and sells: In a strong uptrend it buys pullbacks to the fast EMA
 * and rides with an ATR trailing stop. In a choppy market it buys RSI oversold
 * near the lower Bollinger band and sells RSI overbought near the upper band.
 * When it does NOT work: regime detection is lagging — at the moment a trend
 * starts or ends, the wrong mode is active and it can give back gains or catch
 * a falling knife. Frequent mode switches add fees.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const atr = ctx.atr(14, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || ema50 == null || atr == null || bb == null || rsi == null) return null;

  const px = ctx.price;
  const pos = ctx.position;

  // Regime: how far apart the fast and slow EMAs are, as a fraction of price.
  // A wide gap = strong trend; a narrow gap = chop.
  const spread = Math.abs(ema20 - ema50) / px;

  // Trending regime threshold: fast EMA clearly separated from slow EMA.
  // 0.8% of price on 4h is a meaningful, persistent trend, not noise.
  const trending = spread > 0.008;

  if (pos > 0) {
    // Exit: price closing below the fast EMA in trend mode, or RSI overbought
    // near the upper band in chop mode. ATR trailing guard for trend mode.
    if (trending) {
      // Trail: give the position room equal to 2.5 ATR from the trend anchor.
      const stop = ema20 - 2.5 * atr;
      if (px < stop) return { side: 'sell', qty: pos };
      return null;
    } else {
      // Chop mode: take profit near the upper band / overbought.
      if (px > bb.upper || rsi > 70) return { side: 'sell', qty: pos };
      return null;
    }
  }

  // No position.
  if (trending) {
    // Trend mode: buy a pullback toward the fast EMA while the trend is up.
    // Only buy when EMA20 > EMA50 (uptrend) and price is near/above EMA20.
    if (ema20 > ema50 && px >= ema20 * 0.985) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  } else {
    // Chop mode: buy oversold near the lower band. RSI < 32 = washed out.
    if (px <= bb.lower * 1.01 && rsi < 32) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  }
}
