/*
 * @coinsori-strategy v1
 * name: ETH Regime-Adaptive Vol-Target 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the BTC 1D regime-adaptive vol-target is the validated
 * champion (beats buy-and-hold on all walk-forward windows). This ports the
 * EXACT same logic to ETH to test whether the edge generalizes to a second
 * major asset — if it does, it gives a diversified, validated second strategy.
 * Bet: a liquid major trends above its 50-SMA, and scaling position by how far
 * above it (with a crash stop) captures upside while capping drawdown.
 * When it buys and sells: above SMA50 = invested, position scaled by how far
 * above SMA50; below SMA50 = tight vol-target; beyond the 3-ATR crash band =
 * cash.
 * When it does NOT work: violent bull corrections cut deeper with the larger
 * bull position, and choppy flat regimes cause repeated small rebalancing.
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
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0;
  } else {
    const trendStrength = (price - sma50) / atr;
    let volTarget;
    if (trendUp) {
      volTarget = 0.02 + 0.03 * Math.min(1, Math.max(0, trendStrength));
    } else {
      const distFrac = 1 - (sma50 - price) / crashDist;
      volTarget = 0.02 * Math.max(0.1, distFrac);
    }
    const targetValue = (volTarget * equity) / (atr / price);
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
