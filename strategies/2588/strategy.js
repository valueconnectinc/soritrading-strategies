/*
 * @coinsori-strategy v1
 * name: SOL Trend-Pullback Dip Buyer 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A different entry mechanism than the breakout champion and
 * on a fresh asset (SOL). Instead of buying new 55-day highs, this buys DIPS
 * inside an established uptrend (price above EMA50 above EMA200): pullbacks to
 * the EMA20 in a rising trend tend to resume higher. SOL's strong 2023-26 bull
 * was missed by the 55-day-high breakout (few trades), so a dip-buyer that is
 * active throughout an uptrend may capture more of it.
 * When it buys and sells: buys when SOL is in a confirmed uptrend and pulls
 * back to its 20-day EMA; exits when the trend breaks (close below EMA50) or on
 * a 3x-ATR disaster stop.
 * When it does NOT work: in choppy/range markets the EMA20 dip is not a real
 * support and it buys falling knives; in sharp reversals the EMA50 exit gives
 * back gains; and it stays in cash through sustained bear trends (no short).
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  if (ema20 == null || ema50 == null || ema200 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (price < ema50) return { side: 'sell', qty: pos };
    return null;
  }

  // Confirmed uptrend: price above EMA50 above EMA200.
  const uptrend = price > ema50 && ema50 > ema200;
  if (!uptrend) return null;

  // Dip to the EMA20 (within 0.5 ATR below it) in an uptrend = buy.
  const nearEma20 = price <= ema20 + atr * 0.5 && price > ema20 - atr * 0.5;
  if (nearEma20) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
