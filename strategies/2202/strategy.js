/*
 * @coinsori-strategy v1
 * name: ETH Trend-Gated Vol-Target CrashStop 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the base trend-gated vol-target (full investment above the
 * 50-day average, ATR vol-target below) is validated but still falls hard in a
 * crash because a downtrend only vol-targets to a 2% daily move. This adds a
 * CRASH STOP: if price falls more than 12% below the 50-day average, go fully to
 * cash. This cuts the deepest drawdowns and redeploys cash on the bounce.
 * When it buys and sells: price > SMA50 = full position. price < SMA50 but within
 * 12% = ATR vol-target (2% daily move). price < SMA50 * 0.88 = fully to cash.
 * When it does NOT work: in a fast V-shaped recovery the crash-stop sells at the
 * bottom and misses the bounce; in a slow grind down it may churn between
 * vol-target and cash.
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
  // crash threshold: 12% below the 50-day average (chosen so only deep crashes trigger it)
  const crashStop = price < sma50 * 0.88;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // deep crash: exit fully
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
