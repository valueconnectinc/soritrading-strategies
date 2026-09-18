/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion v4
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Same entry (RSI<35 + at lower BB) but adds a Bollinger Band bandwidth filter:
 * only enter when bandwidth is below its 20-bar SMA — meaning low-volatility compression,
 * which historically precedes stronger mean-reversion moves.
 * When it does NOT work: high-volatility breakout markets where BB widens rapidly.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14);
  const bb = ctx.bb(20, 2);

  if (rsi == null || bb == null || bb.mid == null) return null;

  const price = ctx.price;
  const { lower, mid } = bb;

  // Bandwidth = (upper - lower) / mid — measures BB width as fraction of price
  const bw = (bb.upper - bb.lower) / bb.mid;
  const bwSMA = ctx.sma(20); // 20-bar SMA of bandwidth as a threshold

  // Low-volatility filter: only trade when BB is relatively narrow
  // bwSMA == null means not enough bars for the filter — skip filter in that case
  const lowVol = (bwSMA == null || bw < bwSMA);

  if (ctx.position === 0) {
    if (rsi < 35 && price <= lower && lowVol) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  if (ctx.position > 0) {
    if (rsi > 60 || price >= mid) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
