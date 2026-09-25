/*
 * @coinsori-strategy v1
 * name: Sanity EMA Trend (pure price)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Sanity check that the backtest runner executes code and
 *   produces trades using only price indicators (no external data).
 * When it buys and sells: Buy when EMA50 crosses above EMA200, sell when it
 *   crosses back below.
 * When it does NOT work: Choppy sideways markets whipsaw.
 */
function onUpdate(ctx) {
  const a = ctx.ema(50, 1);
  const b = ctx.ema(200, 1);
  if (a == null || b == null) return null;
  if (ctx.i < 5) ctx.log('bar ' + ctx.i + ' price=' + ctx.price);
  const pos = ctx.position;
  if (pos > 0) {
    if (a < b) return { side: 'sell', qty: pos };
    return null;
  }
  if (a > b) return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  return null;
}
