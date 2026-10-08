/*
 * @coinsori-strategy v1
 * name: BTC 4H Trend-Pullback Volume Confirmed
 * ex: binance
 * syms: BTC
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy:
 * In an uptrend, pullbacks to the 50-bar EMA that hold and resume are the moments
 * with the best risk/reward — the trend does the heavy lifting, the pullback gives
 * a good entry, and volume confirms the move.
 * When it buys and sells:
 * Buys when price is above its 200-bar SMA (uptrend), dips to the 50-bar EMA, and
 * RSI crosses back up through 40 with above-average volume. Sells when RSI gets
 * overbought (70) or price closes below the 50-bar EMA (pullback failed).
 * When it does NOT work:
 * In a bear market or a long sideways chop, the "uptrend" filter keeps flipping and
 * the EMA dip is a falling knife — this loses in choppy/declining regimes.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const ema50 = ctx.ema(50, 1);
  const rsi = ctx.rsi(14, 1);
  const rsiPrev = ctx.rsi(14, 2);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  const price = ctx.price;

  if (sma200 == null || ema50 == null || rsi == null || rsiPrev == null || avgVol == null) return null;

  const inPos = ctx.position > 0;

  // EXIT: overbought or the pullback trend broke
  if (inPos) {
    if (rsi > 70 || price < ema50) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // ENTRY: uptrend + pullback to EMA50 + RSI turning up + volume
  const nearEma = Math.abs(price - ema50) / ema50 < 0.02;
  if (price > sma200 && nearEma && rsiPrev <= 40 && rsi > 40 && vol > avgVol * 1.0) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  return null;
}
