/*
 * @coinsori-strategy v1
 * name: BTC Vol-Targeted Hold v2 Band 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: instead of trying to predict direction, this manages risk.
 * BTC's violent drawdowns cluster in high-volatility periods. By holding a
 * position sized inversely to recent volatility (smaller when wild, larger when
 * calm), the equity curve is smoothed and crash drawdowns are cut, while still
 * participating in the long-term uptrend. No market timing, no regime filter.
 * When it buys and sells: always hold BTC, but only rebalance when the target
 * position (sized so the daily ATR move is a constant fraction of cash) drifts
 * more than 15% from the current position — so it reacts to big volatility
 * swings but does not churn on small daily noise.
 * When it does NOT work: it never beats buy-and-hold in a clean steady bull
 * (it is always partly in cash on average), and it still falls in a crash
 * (just less); it is a risk-reducer, not a return-maximizer.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || price == null || price <= 0) return null;

  // target: daily ATR move should be ~2% of total account value
  const equity = cash + pos * price;
  const targetValue = (0.02 * equity) / (atr / price);
  const targetQty = targetValue / price;
  const curQty = pos;

  // deadband: only rebalance when target is >15% away from current position
  // (15% = ignore small daily noise, react to real volatility shifts)
  if (Math.abs(targetQty - curQty) <= 0.15 * Math.max(curQty, 1e-9)) return null;

  const diff = targetQty - curQty;
  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
