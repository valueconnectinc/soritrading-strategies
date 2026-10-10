/*
 * @coinsori-strategy v1
 * name: BTC Turtle Breakout 4h
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto trends are strong; a classic Turtle-style breakout (20-day high entry, 10-day low exit) rides trends, gated to uptrends only.
 * When it buys and sells: buys when price closes above the 120-bar (20-day) high AND is above the 200-bar EMA; sells when price falls below the 60-bar (10-day) low.
 * When it does NOT work: sideways chop whipsaws; a sharp reversal right after a breakout hits the trailing stop.
 */
function onUpdate(ctx) {
  // Day-scaled turtle lengths: 20 days = 120 bars, 10 days = 60 bars on 4h (6 bars/day).
  const level = ctx.high(120, 1);
  const exitLevel = ctx.low(60, 1);
  const trend = ctx.ema(200, 0);
  if (level == null || exitLevel == null || trend == null) return null;

  if (ctx.position > 0) {
    ctx.watch([{ side: 'sell', price: exitLevel, trigger: 'below', note: 'Turtle 10d trailing exit' }]);
    if (ctx.price < exitLevel) return { side: 'sell', qty: ctx.position };
    return null;
  }

  ctx.watch([{ side: 'buy', price: level, trigger: 'above', note: 'Turtle 20d breakout (uptrend)' }]);
  // Only take breakouts when already in an uptrend — avoids buying into bear markets.
  if (ctx.price > level && ctx.price > trend) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
