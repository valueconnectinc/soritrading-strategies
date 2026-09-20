/*
 * @coinsori-strategy v1
 * name: BTC Daily Donchian Trend Ride v2 (wider exit)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: same turtle-style Donchian trend following as v1, but with
 * a WIDER 30-day exit instead of 20-day, so winners are given more room to run
 * before the strategy exits. In crypto's long bull trends the tighter exit was
 * giving back too much of the gain; a wider exit should capture more.
 * When it buys and sells: buy with full cash when the daily close breaks above
 * the highest close of the last 55 days; sell everything when it breaks below
 * the lowest close of the last 30 days.
 * When it does NOT work: the wider exit means it holds through deeper pullbacks,
 * so drawdown is higher, and in a choppy market it still whipsaws on false
 * breakouts. It also misses the very start of a move because it waits for a
 * 55-day high break.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;

  const entryHigh = ctx.high(55, 1);
  if (entryHigh == null) return null;
  const exitLow = ctx.low(30, 1);
  if (exitLow == null) return null;

  if (pos <= 0) {
    if (price > entryHigh) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    if (price < exitLow) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
