/*
 * @coinsori-strategy v1
 * name: ETH Trend-Gated Vol-Target LowChurn 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the 4h vol-target champion generalizes to ETH (all windows beat
 * hold) but churns 7400-8500 trades from continuous vol-target rebalancing, costing
 * heavy fees. This adds a rebalance threshold so it only trades when the target
 * position shifts by more than 5% of current size, cutting churn while keeping
 * most of the alpha.
 * When it buys and sells: above SMA50 = fully invested; below = position scaled by
 * closeness to SMA50; beyond the ATR crash band = cash. Only rebalance when the
 * desired size differs from current by >5%.
 * When it does NOT work: violent bull corrections give deep drawdowns, and the
 * threshold may delay exiting a fast crash.
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
  } else if (trendUp) {
    targetQty = equity / price;
  } else {
    const distFrac = 1 - (sma50 - price) / crashDist;
    const targetValue = (0.02 * equity) / (atr / price) * Math.max(0.1, distFrac);
    targetQty = targetValue / price;
  }

  const curQty = pos;
  const diff = targetQty - curQty;
  // only rebalance when the desired size differs by >5% of current position —
  // cuts the constant vol-target churn that drove 7400+ trades
  if (Math.abs(diff) < 0.05 * Math.max(0.0001, curQty)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
