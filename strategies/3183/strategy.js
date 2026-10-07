/*
 * @coinsori-strategy v1
 * name: BTC 4H Momentum-Confirmed EMA Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: crypto trends in 4h waves, and EMA20/50 crossovers catch them.
 * Adding a momentum filter (price above its 20-bar ago level) skips the choppy
 * whipsaw entries that pure crossovers take.
 * When it buys and sells: Buy when the fast EMA crosses above the slow EMA AND price is
 * above its level 20 bars ago. Sell when the fast EMA crosses back below the slow EMA.
 * When it does NOT work: In flat range-bound markets the two EMAs still cross on noise;
 * and in a fast crash the exit lags, so a hard stop would be safer than the EMA exit.
 */
function onUpdate(ctx) {
  const f = ctx.ema(20, 1), s = ctx.ema(50, 1);
  const fp = ctx.ema(20, 2), sp = ctx.ema(50, 2);
  if (f == null || s == null || fp == null || sp == null) return null;

  // exit first: fast EMA crossing below slow EMA on closed bars
  if (ctx.position > 0 && fp >= sp && f < s) {
    return { side: 'sell', qty: ctx.position };
  }

  // momentum confirmation: current price above the close 20 bars ago
  const closes = ctx.closes;
  if (ctx.position === 0 && fp <= sp && f > s) {
    const nowPx = closes[closes.length - 2];
    const pastPx = closes[closes.length - 22];
    if (nowPx != null && pastPx != null && nowPx > pastPx) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }
  return null;
}
