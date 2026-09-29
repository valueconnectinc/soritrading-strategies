/*
 * @coinsori-strategy v1
 * name: DIAGNOSTIC always-buy
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: DIAGNOSTIC ONLY. Buys 25% equity in every asset on every bar to test
 * whether the backtest runner actually executes the code saved to this strategy slot.
 * When it buys and sells: Buy every bar, never sell. Not a real strategy.
 * When it does NOT work: Not a real strategy — diagnostic only.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;
  const equity = ctx.cash + ctx.uPnl;
  const targetValue = 0.25 * (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash);
  return { side: 'buy', qty: targetValue / price };
}
