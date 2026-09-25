/*
 * @coinsori-strategy v1
 * name: ETH 4H Trend-Pullback Dip Buy
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A genuinely different family from breakout — instead of buying
 *   new highs, buy temporary pullbacks inside an established uptrend. In a strong trend,
 *   dips to oversold are buying opportunities (mean-reversion WITHIN a trend), not the
 *   start of a reversal. This complements the volume-surge breakout champion.
 * When it buys and sells: Only when price is above the 200-bar EMA (uptrend). Buy when
 *   RSI(14) drops below 40 (a pullback). Sell when RSI climbs above 70 (overbought) or
 *   price closes back below the 50-bar EMA (trend weakening).
 * When it does NOT work: In choppy/sideways markets the EMA200 gate whipsaws and dips
 *   keep falling (no real uptrend to bounce off). Long-only, misses short-side gains.
 */
function onUpdate(ctx) {
  const ema200 = ctx.ema(200, 1);
  const ema50 = ctx.ema(50, 1);
  const rsi = ctx.rsi(14, 1);
  const price = ctx.price;
  if (ema200 == null || ema50 == null || rsi == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    // exit: overbought or trend breaking down
    if (rsi > 70 || price < ema50) return { side: 'sell', qty: pos };
    return null;
  }
  // entry: uptrend confirmed AND RSI pulled back to oversold
  if (price > ema200 && rsi < 40) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
