/*
 * @coinsori-strategy v1
 * name: BTC EMA Trend (no filter)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Control version to isolate the value of the fear/greed
 *   filter. Pure EMA(20/100) trend following with a 200-day long-term gate.
 * When it buys and sells: Buy when the short trend is above the long trend and
 *   price is above the 200-day average. Sell when the short trend turns down.
 * When it does NOT work: Straight-line melt-ups where it sits in cash and lags
 *   buy-and-hold.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(20, 1);
  const slow = ctx.ema(100, 1);
  if (fast == null || slow == null) return null;

  const lt = ctx.sma(200, 1);
  if (lt == null) return null;
  const price = ctx.closes[ctx.closes.length - 1];

  if (ctx.position > 0) {
    if (fast < slow) return { side: 'sell', qty: ctx.position };
    return null;
  }

  if (fast > slow && price > lt) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
