/*
 * @coinsori-strategy v1
 * name: ETH Regime-Adaptive Vol-Target TrendScaled 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: same regime-adaptive vol-target logic as the validated BTC
 * version — in a strong uptrend the vol target relaxes so the position can grow
 * with the trend; in chop or mild downtrend it stays tight. Run on ETH to check
 * the edge transfers across symbols (robustness, not a BTC fluke).
 * When it buys and sells: above SMA50 = invested, position scaled by how far
 * above SMA50 (stronger trend = higher vol target). Below SMA50 = tight
 * vol-target, scaled by closeness. Beyond the ATR crash band = cash.
 * When it does NOT work: in a violent bull correction the larger bull position
 * means deeper drawdowns; a fast V-recovery still risks selling near the bottom.
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
    targetQty = 0; // real crash: exit fully
  } else {
    // Same relaxation as the BTC baseline: 2% base vol target, up to 5% when
    // 1+ ATR above SMA50. Unchanged on purpose — this is a transfer test.
    const trendStrength = (price - sma50) / atr; // in ATR units
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
