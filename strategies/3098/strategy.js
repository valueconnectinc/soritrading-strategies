/*
 * @coinsori-strategy v1
 * name: BTC Keltner Pullback
 * ex: upbit
 * syms: BTC
 * interval: 4h
 * cash: 10000000
 *
 * Why this strategy: In an uptrend, price often pulls back to a volatility
 * band (Keltner channel) before resuming. Buying that pullback near the lower
 * band, only while the long-term trend is rising, gets a good entry with tight
 * risk and rides the resumption.
 * When it buys and sells: Buys when price touches the lower Keltner band
 * (20-period EMA minus 2.5x ATR) while the 200-period average is rising.
 * Sells when price climbs back above the 20-period EMA, or immediately if
 * price falls below the 200-period average.
 * When it does NOT work: In a real bear market the trend gate keeps it in cash,
 * and in a melt-up the pullbacks are shallow so entries are rare and it lags
 * holding the whole way up.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const ma200 = ctx.sma(200, 1);
  const ma200prev = ctx.sma(200, 2);
  if (ema20 == null || atr == null || ma200 == null || ma200prev == null) return null;

  const px = ctx.price;
  const prevClose = ctx.closes[ctx.closes.length - 2];
  if (prevClose == null) return null;

  // lower Keltner band = 20-EMA minus 2.5x ATR (a volatility pullback level)
  const lower = ema20 - 2.5 * atr;
  const rising = ma200 > ma200prev;

  if (ctx.position === 0) {
    // pullback to the lower band, only while the long-term trend is rising
    if (rising && prevClose <= lower) {
      return { side: 'buy', qty: ctx.cash / px * 0.98 };
    }
    return null;
  }

  // hard stop: below the 200-period average, get out fast
  if (prevClose < ma200) {
    return { side: 'sell', qty: ctx.position };
  }
  // normal exit: price recovered back above the 20-period EMA
  if (prevClose > ema20) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
