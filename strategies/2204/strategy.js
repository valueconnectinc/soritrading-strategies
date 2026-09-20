/*
 * @coinsori-strategy v1
 * name: ETH Trend-Gated Vol-Target CrashStop Confirm 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the crash-stop (exit fully when price falls >12% below the
 * 50-day average) is validated but can whipsaw out on a single sharp daily spike
 * that immediately recovers. This version requires the crash condition to hold on
 * TWO consecutive closed bars before exiting fully, cutting churn and false exits
 * while still avoiding the deepest drawdowns.
 * When it buys and sells: price > SMA50 = full. price < SMA50 but within 12% = ATR
 * vol-target. price < SMA50*0.88 for two consecutive bars = fully to cash.
 * When it does NOT work: a genuine fast crash can drop more before the two-bar
 * confirmation completes, so it exits slightly later than the single-bar version;
 * in a slow grind down it may still churn between vol-target and cash.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || price == null || price <= 0) return null;

  // check the crash condition on the current and previous closed bar
  const crashNow = price < sma50 * 0.88;
  const p1 = ctx.closes[ctx.closes.length - 2];
  const s1 = ctx.sma(50, 2);
  const crashPrev = (p1 != null && s1 != null) ? p1 < s1 * 0.88 : false;
  const crashStop = crashNow && crashPrev; // two consecutive bars below the crash line

  const equity = cash + pos * price;
  const trendUp = price > sma50;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // confirmed deep crash: exit fully
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
