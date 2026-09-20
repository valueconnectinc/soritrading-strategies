/*
 * @coinsori-strategy v1
 * name: ETH Trend-Gated Fixed-Fraction 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the 4h vol-target champion beats hold but churns 7400-8500
 * trades from continuous vol-target rebalancing (the rebalance deadband failed —
 * delaying rebalancing held the wrong size during fast moves). This replaces the
 * continuous vol-target with a FIXED position fraction below the SMA50: instead of
 * scaling to a 2% vol-target every bar, it holds a constant 30% position in the
 * choppy below-SMA regime and 100% above it. No per-bar rebalancing, so churn
 * collapses while the bear-alpha structure is preserved.
 * When it buys and sells: above SMA50 = 100%; below SMA50 = fixed 30%; beyond the
 * ATR crash band = cash. Transitions only at those three regime boundaries.
 * When it does NOT work: the fixed 30% is too big in a violent melt-down and too
 * small in a strong choppy recovery; it may lag the vol-target's adaptive sizing.
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
  const crashStop = price < sma50 - 3.0 * atr;

  let targetQty;
  if (crashStop) {
    targetQty = 0;                 // crash: go to cash
  } else if (trendUp) {
    targetQty = equity / price;    // bull: fully invested
  } else {
    targetQty = 0.30 * equity / price;  // choppy below-SMA: fixed 30% (no vol-target churn)
  }

  const curQty = pos;
  const diff = targetQty - curQty;
  if (Math.abs(diff) < 0.001 * Math.max(0.0001, curQty)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
