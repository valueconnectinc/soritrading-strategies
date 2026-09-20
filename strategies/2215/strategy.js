/*
 * @coinsori-strategy v1
 * name: SOL Trailing-Peak ProfitLock 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: every attempt to predict SOL's drawdowns (trend gates, vol
 * filters, macro, hashrate, fear/greed, OI, diversification) failed because the
 * drawdowns are inherent and unpredictable. This tries a DIFFERENT mechanism —
 * profit-locking with a trailing stop that follows the price PEAK rather than a
 * moving average. Instead of predicting the crash, it locks in a large fraction
 * of the peak before the full drawdown develops, which directly caps the loss
 * from peak to trough.
 * When it buys and sells: above SMA50 and within 25% of the trailing peak = fully
 * invested. If price falls more than 25% from its running peak, exit fully to
 * cash and wait for the trend gate to re-enter on the way back up.
 * When it does NOT work: a sharp V-shaped crash-and-recovery sells near the
 * bottom and misses the bounce, and in a healthy-but-choppy bull the 25% trailing
 * band can trigger on a normal pullback, trimming upside vs buy-and-hold.
 */
function onUpdate(ctx) {
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (sma50 == null || price == null || price <= 0) return null;

  // Track the running peak (highest price seen) across bars.
  let peak = ctx.state.peak;
  if (peak == null || price > peak) peak = price;
  ctx.state.peak = peak;

  const equity = cash + pos * price;
  const trendUp = price > sma50;
  // Trailing stop: 25% below the peak. Chosen to be loose enough to survive
  // normal SOL pullbacks (which are often 10-15%) but tight enough to lock in a
  // large fraction of the peak before the 40-64% drawdowns the champion suffers.
  const trailStop = price < peak * 0.75;

  let targetQty;
  if (trailStop) {
    targetQty = 0; // locked in: exit fully, wait for re-entry
  } else if (trendUp) {
    targetQty = equity / price; // uptrend above peak band: stay fully invested
  } else {
    // below SMA50 but not stopped out: stay out (conservative) — do not chase
    targetQty = 0;
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
