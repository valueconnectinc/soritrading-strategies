/*
 * @coinsori-strategy v1
 * name: BTC SMA50 Trend Plain
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: control test — a plain 50-day SMA trend filter with no
 * on-chain gate, to isolate whether the on-chain filter was the reason the
 * hybrid produced 0 trades.
 * When it buys: price above 50-SMA. When it sells: price below 50-SMA.
 * When it does NOT work: sideways chop whipsaws the SMA.
 */
function onUpdate(ctx) {
  const sma50 = ctx.sma(50, 1);
  if (sma50 == null) return null;
  const price = ctx.price;
  const pos = ctx.position;
  if (pos > 0) {
    if (price < sma50) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > sma50) return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  return null;
}
