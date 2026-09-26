/*
 * @coinsori-strategy v1
 * name: Defensive Donchian Price-Bull Wide Exit BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The data-independent defensive Donchian family is the
 * reliable offline fallback, but it exits too early on normal pullbacks in
 * strong bull runs (the fed gate fixes this but needs external data). Here I
 * replace the fed gate with a PURE-PRICE bull proxy: when price holds above
 * its 100-day EMA, the market is in a confirmed uptrend, so we hold through
 * normal pullbacks with a wider 60-day exit; below it we use the tight
 * 30-day exit. This captures more bull upside with NO external data, so it
 * runs identically whether or not the user's agent is online.
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep
 * downtrend), sized by inverse volatility; exits on a 3x-ATR stop, or a
 * 60-day low when price>EMA100, else a tight 30-day low.
 * When it does NOT work: high drawdown in sharp reversals (MDD 40-60% is
 * inherent); the EMA100 proxy is cruder than the fed gate and may keep the
 * wide stop active into an early bear; underperforms in choppy sideways.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  const ema100 = ctx.ema(100, 1);
  if (hh55 == null || ll30 == null || atr == null || ema50 == null || ema100 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    // Wide 60-day exit only in a confirmed bull (price above 100-day EMA),
    // else tight 30-day. Pure-price proxy for the fed gate.
    const exitLow = price > ema100 ? ctx.low(60, 1) : ll30;
    if (exitLow != null && price < exitLow) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  // Skip entry only at a TRUE blowoff top (4x ATR above the 100-day EMA).
  // 2.5x was too tight and blocked normal bull entries (price legitimately
  // stays far above EMA100 in strong trends); 4x only triggers at extremes.
  if (price > ema100 + atr * 4) return null;

  if (price > hh55) {
    const volRatio = atr / price;
    const size = Math.min(0.99, Math.max(0.25, 0.03 / volRatio));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
