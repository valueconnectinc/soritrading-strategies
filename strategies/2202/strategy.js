/*
 * @coinsori-strategy v1
 * name: ETH Trend-Gated Vol-Target CrashStop+Recovery 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the crash-stop version (exit fully when price falls >12%
 * below the 50-day average) cut drawdowns but has a known weakness in V-shaped
 * recoveries — it only re-enters when price crosses back ABOVE the 50-day
 * average, so it misses most of the bounce. This adds a RECOVERY RE-ENTRY: after
 * a crash-stop has put us in cash, we re-enter as soon as price climbs back to
 * within 3% of the 50-day average, catching the bounce much earlier while still
 * avoiding the deepest part of the crash.
 * When it buys and sells: price > SMA50 = full position. price < SMA50 but within
 * 12% = ATR vol-target (2% daily). price < SMA50*0.88 = crash-stop to cash. After
 * a crash-stop, re-enter when price recovers above SMA50*0.97 (instead of waiting
 * for full SMA50 crossover).
 * When it does NOT work: in a slow grind down that keeps re-triggering the crash
 * stop, the earlier re-entry can buy back into a continuing downtrend; in a
 * choppy range near the 50-day average it may churn between vol-target and cash.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > sma50;
  const crashStop = price < sma50 * 0.88; // deep crash: exit fully (12% below SMA50)

  // track whether we are in "crash cash" state (armed by a crash-stop exit)
  let inCrashCash = ctx.state.crashCash === true;
  if (crashStop) {
    inCrashCash = true; // re-armed while still in the crash zone
  }

  let targetQty;
  if (inCrashCash) {
    // recovery re-entry: come back once price is within 3% of SMA50 (SMA50*0.97)
    if (price > sma50 * 0.97) {
      targetQty = equity / price; // recovered: full position
      inCrashCash = false;
    } else {
      targetQty = 0; // still too far below: stay in cash
    }
  } else if (trendUp) {
    targetQty = equity / price; // uptrend: stay fully invested
  } else {
    const targetValue = (0.02 * equity) / (atr / price); // mild downtrend: vol-target
    targetQty = targetValue / price;
  }

  const curQty = pos;
  const diff = targetQty - curQty;
  if (Math.abs(diff) < 0.0001 * Math.max(0.0001, curQty)) {
    ctx.state.crashCash = inCrashCash;
    return null;
  }

  ctx.state.crashCash = inCrashCash;
  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
