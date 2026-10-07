/*
 * @coinsori-strategy v1
 * name: BTC 4H Donchian Turtle Trend v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: crypto trends hard after breaking multi-week ranges. A wider 30-bar
 * Donchian breakout buys only the strongest breaks, cutting false signals in choppy
 * markets. The 200-bar SMA gate keeps us out of bear markets.
 * When it buys and sells: Buy when the previous close breaks above the highest high of
 * the prior 30 bars. Sell when the previous close breaks below the lowest low of the
 * prior 10 bars (or the SMA gate flips).
 * When it does NOT work: In a range-bound market, even 30-bar breakouts get stopped on
 * the next pullback — repeated small losses. Whipsaws are the cost of catching the trend.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 40) return null;

  const hi30 = ctx.high(30, 2);
  const lo10 = ctx.low(10, 2);
  if (hi30 == null || lo10 == null) return null;
  const prevClose = closes[closes.length - 2];

  if (ctx.position > 0 && (prevClose < lo10 || prevClose < sma200)) {
    return { side: 'sell', qty: ctx.position };
  }

  if (ctx.position === 0 && prevClose > hi30 && prevClose > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
