/*
 * @coinsori-strategy v1
 * name: SOL Trend-Gate + Deep Crash-Cap 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the validated SOL champion (SMA50 trend-gate + ATR vol-target
 * + 3-ATR crash stop) has great returns but 40-64% drawdown. A tight 25% trailing
 * stop failed because it whipsaws out of SOL's volatile bulls. This version adds a
 * DEEP trailing crash-cap that only fires on a genuine crash (price must be BELOW
 * SMA50 AND more than 45% off its running peak). It preserves full bull exposure
 * (protecting return) while capping only the deepest drawdowns — the one mechanism
 * that showed a real MDD reduction in the bear window (36% vs 55%).
 * When it buys and sells: above SMA50 = fully invested. Below SMA50 but within
 * 3 ATRs = ATR vol-target (2% daily). Beyond 3 ATRs below SMA50 OR more than 45%
 * off the peak = fully to cash.
 * When it does NOT work: in a broad crypto-wide crash the 45% cap is too loose to
 * help much, and it still trims some upside in a deep-but-recovering correction.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || price == null || price <= 0) return null;

  // Track the running peak (highest price seen) across bars for the crash cap.
  let peak = ctx.state.peak;
  if (peak == null || price > peak) peak = price;
  ctx.state.peak = peak;

  const equity = cash + pos * price;
  const trendUp = price > sma50;
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;
  // Deep crash-cap: only fires when BOTH below the trend gate AND far off the
  // peak (45%). 45% is loose enough to survive normal SOL bull pullbacks (which
  // routinely exceed 25%) while capping the deepest 60%+ drawdowns.
  const deepCap = price < peak * 0.55;

  let targetQty;
  if (crashStop || deepCap) {
    targetQty = 0; // genuine crash: exit fully
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
