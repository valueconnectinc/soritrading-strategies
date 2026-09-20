/*
 * @coinsori-strategy v1
 * name: ETH Vol-Targeted Hold Deadband 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the daily vol-targeted ETH hold is proven (beats hold in
 * 2/3 windows, consistent ~38% MDD) but churns ~3900 trades/window because it
 * rebalances every single day. This version adds a deadband: it only
 * rebalances when the current position deviates from the vol target by more
 * than a threshold. The BTC cycle showed time-based weekly rebalancing fails
 * (too slow to de-risk in crashes), but a VALUE-based deadband is different —
 * it still reacts immediately when vol spikes (which is exactly when you must
 * de-risk), it just skips the tiny daily noise rebalances. This should cut
 * churn while keeping the crash protection.
 * When it buys and sells: always hold ETH, sized so the daily ATR move is ~2%
 * of account value. Only rebalance when off-target by more than 10%. Sell down
 * when ATR spikes, buy back when it calms. Never fully flat.
 * When it does NOT work: if the deadband is too wide it becomes slow to de-risk
 * in a fast crash (the weekly-rebalancing failure mode); it never beats
 * buy-and-hold in a clean bull. Daily rebalancing without the deadband is the
 * proven default.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const targetValue = (0.02 * equity) / (atr / price);
  const targetQty = targetValue / price;
  const curQty = pos;

  // deadband: only rebalance when off-target by more than 10% of target
  // (judgement: 10% skips daily noise but still reacts to vol spikes that
  // move the target by >10% — the crash-protection trigger)
  const diff = targetQty - curQty;
  if (Math.abs(diff) < 0.10 * Math.max(0.0001, targetQty)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
