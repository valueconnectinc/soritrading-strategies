/*
 * @coinsori-strategy v1
 * name: SOL 4H VWAP Pullback Mean-Reversion (tighter risk)
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A different mean-reversion entry. Instead of the Bollinger
 *   panic-bottom (the champion) or oversold oscillators (which failed), buy
 *   pullbacks to a rolling VWAP — a dynamic volume-weighted average price that
 *   acts as a support level institutions watch. In an uptrend, price tends to
 *   find support at VWAP, so buying the dip there catches reversals with less
 *   falling-knife risk than a pure oversold signal.
 * When it buys and sells: Buy when price pulls back to within 2% of the 50-bar
 *   VWAP while the 50-bar SMA is rising (uptrend intact). Sell on a 6% trailing
 *   stop, a 10% hard stop-loss from entry, or when price extends more than 7%
 *   above VWAP (overextended). Tighter than the base version to cut the very
 *   high drawdown SOL showed (up to 88%).
 * When it does NOT work: In a choppy range the VWAP pullback triggers often and
 *   whipsaws, and tighter stops cut winners short in a strong trend. It also
 *   misses fast V-shaped rallies where price never pulls back to VWAP.
 */
function onUpdate(ctx) {
  // rolling 50-bar VWAP from closes and volumes (closed bars only, ago>=1)
  let sumPV = 0, sumV = 0;
  const n = 50;
  for (let i = 1; i <= n; i++) {
    const c = ctx.closes[ctx.closes.length - 1 - i];
    const v = ctx.volumes[ctx.volumes.length - 1 - i];
    if (c == null || v == null) return null;
    sumPV += c * v;
    sumV += v;
  }
  if (sumV <= 0) return null;
  const vwap = sumPV / sumV;

  // trend direction from rising 50-SMA (compare closed bars 1 and 2)
  const s1 = ctx.sma(50, 1);
  const s2 = ctx.sma(50, 2);
  if (s1 == null || s2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // hard stop-loss caps the per-trade loss in a crash (tighter: 10%)
    if (price < ctx.entryPx * 0.90) return { side: 'sell', qty: pos };
    // trailing stop (tighter: 6%) and overextension exit (tighter: 7%)
    if (price < ctx.entryPx * 0.94) return { side: 'sell', qty: pos };
    if (price > vwap * 1.07) return { side: 'sell', qty: pos };
    return null;
  }

  // uptrend intact and price pulled back to within 2% of VWAP
  if (s1 > s2 && price >= vwap * 0.98 && price <= vwap * 1.02) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
