/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion DOGE 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean-reversion family. When price touches the lower
 * Bollinger band with RSI oversold, it is a panic sell-off that tends to
 * bounce back to the middle band. This exact recipe has held up on 10 assets
 * (SOL/ATOM/UNI/LINK/AVAX/ADA/BNB/DOT/XRP/LTC) with low drawdown. Extending
 * it to DOGE, a high-volume large-cap that mean-reverts around its bands.
 * When it buys and sells: buys when price closes at/below the lower band with
 * RSI below 35; sells when price reaches the middle band or RSI turns above 65.
 * When it does NOT work: in strong trending rallies where price hugs the outer
 * band for long stretches it stays in cash and misses the move; and it can
 * catch falling knives in persistent downtrends. Defensive, not a bull-chaser.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const rsiPrev = ctx.rsi(14, 2);
  if (bb == null || rsi == null || rsiPrev == null) return null;

  const px = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Exit: price back at the middle band, or RSI turning overbought.
    if (px >= bb.mid || (rsi > 65 && rsiPrev <= 65)) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Entry: panic sell-off — price at/below the lower band with RSI oversold.
  if (px <= bb.lower && rsi < 35) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
