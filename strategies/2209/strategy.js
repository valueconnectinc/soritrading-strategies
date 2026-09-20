/*
 * @coinsori-strategy v1
 * name: SOL Trend-Gated Vol-Target AdaptiveCrash Reentry 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: improvement on the validated SOL trend-gated vol-target
 * champion. The original's weakness is that after a crash-stop full exit it waits
 * for price to climb all the way back above SMA50 before re-entering, so V-shaped
 * recoveries are missed. This version re-enters on a faster SMA20 reclaim while the
 * SMA50 gate still controls the normal regime.
 * When it buys and sells: above SMA50 = fully invested; below SMA50 within an
 * ATR-scaled band = ATR vol-target; beyond the crash band = cash. After a crash
 * exit, re-enter when price reclaims SMA20 (fast recovery catch) instead of waiting
 * for the full SMA50 recovery.
 * When it does NOT work: SOL's volatility still means deep drawdowns in violent
 * bull corrections; the faster re-entry adds whipsaw risk in choppy bear markets
 * where SMA20 reclaims are false signals.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const sma20 = ctx.sma(20, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || sma20 == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > sma50;
  // ATR-scaled crash band: 3.0 ATRs below the SMA50. Chosen so normal SOL dips
  // (1-2 ATR) stay in the vol-target regime and only a genuine crash (>3 ATR)
  // triggers the full exit.
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  let targetQty;
  if (crashStop) {
    // Real crash: exit fully. But if we were already flat from a prior crash and
    // price has since reclaimed the fast SMA20, re-enter to catch a V-recovery
    // rather than waiting for the full SMA50 climb.
    if (pos <= 0 && price > sma20) {
      targetQty = equity / price;
    } else {
      targetQty = 0;
    }
  } else if (trendUp) {
    targetQty = equity / price; // uptrend: stay fully invested
  } else {
    const targetValue = (0.02 * equity) / (atr / price); // mild downtrend: vol-target
    targetQty = targetValue / price;
  }

  const curQty = pos;
  const diff = targetQty - curQty;
  if (Math.abs(diff) < 0.0001 * Math.max(0.0001, curQty)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
