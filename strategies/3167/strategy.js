/*
 * @coinsori-strategy v1
 * name: BTC 200-Day Trend Hysteresis 7% 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's price vs its 200-day average is the classic long-term trend filter. A 7% hysteresis band prevents re-entering on fake breakouts right at the line — the killer flaw of a plain 200-SMA crossover.
 * When it buys and sells: Buys when price closes 7% above the 200-day SMA. Sells when price closes 7% below it. Otherwise it holds or stays in cash.
 * When it does NOT work: Choppy, sideways years where price oscillates around the 200-day line without establishing a real trend — expect a few whipsaw round-trips and long flat periods.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const holding = ctx.position > 0;
  if (!holding && price > sma200 * 1.07) {
    ctx.watch([{ side: 'buy', price: price, note: 'breakout above 200d' }]);
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  if (holding && price < sma200 * 0.93) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
