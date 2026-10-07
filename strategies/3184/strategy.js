/*
 * @coinsori-strategy v1
 * name: BTC 4H Donchian Turtle Trend v3
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: crypto trends hard after breaking multi-week ranges. A wide 30-bar
 * entry buys only the strongest breaks; a wider 20-bar exit lets winners breathe through
 * pullbacks instead of being shaken out. The 200-bar SMA gate keeps us out of bear markets.
 * When it buys and sells: Buy when the previous close breaks above the highest high of
 * the prior 30 bars. Sell when the previous close breaks below the lowest low of the
 * prior 20 bars (or the SMA gate flips).
 * When it does NOT work: In a range-bound market, breakouts get stopped on the next
 * pullback — repeated small losses. The wider exit also gives back more profit on sharp
 * V-shaped reversals.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 40) return null;

  const hi30 = ctx.high(30, 2);
  const lo20 = ctx.low(20, 2);
  if (hi30 == null || lo20 == null) return null;
  const prevClose = closes[closes.length - 2];

  if (ctx.position > 0 && (prevClose < lo20 || prevClose < sma200)) {
    return { side: 'sell', qty: ctx.position };
  }

  if (ctx.position === 0 && prevClose > hi30 && prevClose > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
