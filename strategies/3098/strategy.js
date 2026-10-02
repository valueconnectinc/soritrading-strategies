/*
 * @coinsori-strategy v1
 * name: SOL Keltner Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In an uptrend, price often pulls back to a volatility
 * band (Keltner channel) before resuming. Buying that pullback near the lower
 * band, only while above the 200-day average, gets a good entry with a tight
 * risk and rides the resumption.
 * When it buys and sells: Buys when price touches the lower Keltner band
 * (20-day EMA minus 2.5x ATR) while price is above the 200-day average.
 * Sells when price climbs back above the 20-day EMA, or immediately if price
 * falls below the 200-day average.
 * When it does NOT work: In a real bear market the trend gate keeps it in cash
 * (no return), and in a melt-up the pullbacks are shallow so entries are rare
 * and it lags holding the whole way up.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const ma200 = ctx.sma(200, 1);
  if (ema20 == null || atr == null || ma200 == null) return null;

  const px = ctx.price;
  const prevClose = ctx.closes[ctx.closes.length - 2];
  if (prevClose == null) return null;

  // lower Keltner band = 20-EMA minus 2.5x ATR (a volatility pullback level)
  const lower = ema20 - 2.5 * atr;

  if (ctx.position === 0) {
    // pullback to the lower band, but only while above the long-term trend
    if (prevClose > ma200 && prevClose <= lower) {
      return { side: 'buy', qty: ctx.cash / px * 0.98 };
    }
    return null;
  }

  // hard stop: below the 200-day average, get out fast
  if (prevClose < ma200) {
    return { side: 'sell', qty: ctx.position };
  }
  // normal exit: price recovered back above the 20-day EMA
  if (prevClose > ema20) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
