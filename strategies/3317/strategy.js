/*
 * @coinsori-strategy v1
 * name: BTC Donchian Breakout 4h
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto trends are strong and persistent; a Donchian channel breakout catches new highs early and rides the trend while it lasts.
 * When it buys and sells: buys when price closes above the 55-bar high; sells when price falls below the 20-bar low (a trailing stop that lets winners run).
 * When it does NOT work: sideways chop produces repeated false breakouts and whipsaw losses; a sharp reversal right after a breakout hits the trailing stop.
 */
function onUpdate(ctx) {
  // 55-bar high of the last CLOSED bars = breakout trigger; 20-bar low = trailing exit.
  // Using ago=1 keeps the levels identical in backtest, paper and live (closed bars only).
  const level = ctx.high(55, 1);
  const exitLevel = ctx.low(20, 1);
  if (level == null || exitLevel == null) return null;

  if (ctx.position > 0) {
    ctx.watch([{ side: 'sell', price: exitLevel, trigger: 'below', note: 'Donchian 20 trailing exit' }]);
    if (ctx.price < exitLevel) return { side: 'sell', qty: ctx.position };
    return null;
  }

  ctx.watch([{ side: 'buy', price: level, trigger: 'above', note: 'Donchian 55 breakout' }]);
  if (ctx.price > level) return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  return null;
}
