/*
 * @coinsori-strategy v1
 * name: BTC Regime-Adaptive Vol-Target Relax4 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: perturbation of the validated BTC regime-adaptive
 * vol-target. Identical logic, only the bull relax cap is lowered from 5% to
 * 4% daily vol target. If results stay close to the baseline, the 5% number is
 * not a fragile tuning artifact.
 * When it buys and sells: above SMA50 = invested, position scaled by how far
 * above SMA50. Below SMA50 = tight vol-target. Beyond the ATR crash band = cash.
 * When it does NOT work: same as baseline — violent bull corrections cut deeper
 * with the larger bull position.
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
    // Perturbation: relax cap 4% instead of 5% (baseline 2% + 3%). If the edge
    // survives this, the exact cap value is not doing the heavy lifting.
    const trendStrength = (price - sma50) / atr;
    let volTarget;
    if (trendUp) {
      volTarget = 0.02 + 0.02 * Math.min(1, Math.max(0, trendStrength));
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
