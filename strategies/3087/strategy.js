/*
 * @coinsori-strategy v1
 * name: Data Probe BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Probe strategy: buys when RSI crosses up from oversold to confirm data loads.
 */
function onUpdate(ctx) {
  const r1 = ctx.rsi(14, 1);
  const r2 = ctx.rsi(14, 2);
  if (r1 == null || r2 == null) return null;
  const pos = ctx.position;
  if (pos > 0) return { side: 'sell', qty: pos };
  if (r2 < 30 && r1 >= 30) return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  return null;
}
