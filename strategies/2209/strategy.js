/*
 * @coinsori-strategy v1
 * name: SOL Trend-Gated Vol-Target CrashStop 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the validated ETH trend-gated vol-target crash-stop recipe is
 * applied to SOL as a different-asset diversification play (same robust trend
 * family, new market). Above the 50-day average it stays fully invested; below it
 * vol-targets to a 2% daily move; in a deep crash (>12% below the average) it goes
 * fully to cash to cut the deepest drawdowns.
 * When it buys and sells: price > SMA50 = full. price < SMA50 but within 12% = ATR
 * vol-target (2% daily). price < SMA50*0.88 = fully to cash.
 * When it does NOT work: SOL is far more volatile than ETH, so the fixed 12% crash
 * threshold and 2% vol-target may be too tight or too loose for its regime; in a
 * fast V-shaped recovery the crash-stop sells at the bottom and misses the bounce.
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
