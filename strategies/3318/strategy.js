/*
 * @coinsori-strategy v1
 * name: BTC Donchian Breakout 4h
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto trends are strong; a Donchian breakout catches new highs, but only in an uptrend (price above EMA200) so it avoids buying into bear markets.
 * When it buys and sells: buys when price closes above the 55-bar high AND is above the 200-bar EMA; sells when price falls below the 20-bar low (trailing stop).
 * When it does NOT work: sideways chop still whipsaws; a sharp reversal right after a breakout hits the trailing stop.
 */
function onUpdate(ctx) {
  const level = ctx.high(55, 1);
  const exitLevel = ctx.low(20, 1);
  const trend = ctx.ema(200, 0); // current-bar EMA200, the uptrend gate
  if (level == null || exitLevel == null || trend == null) return null;

  if (ctx.position > 0) {
    ctx.watch([{ side: 'sell', price: exitLevel, trigger: 'below', note: 'Donchian 20 trailing exit' }]);
    if (ctx.price < exitLevel) return { side: 'sell', qty: ctx.position };
    return null;
  }

  ctx.watch([{ side: 'buy', price: level, trigger: 'above', note: 'Donchian 55 breakout (uptrend)' }]);
  // Only take breakouts when already in an uptrend — avoids buying into bear markets.
  if (ctx.price > level && ctx.price > trend) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
