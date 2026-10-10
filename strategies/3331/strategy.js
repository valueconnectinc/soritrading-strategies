/*
 * @coinsori-strategy v1
 * name: BTC EMA Trend ATR Trail 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Bitcoin trends in long waves. A slow EMA crossover (50 vs 200) marks the start of a new trend; an ATR-based trailing stop rides the trend while cutting losers early.
 * When it buys and sells: Buys when the 50-bar EMA crosses above the 200-bar EMA (golden cross); sells when it crosses back down (death cross) or when price falls 4 ATR below the highest point since entry.
 * When it does NOT work: In sideways chop the crossovers whipsaw and generate many small losing trades; it is always fully exposed in uptrends, so a sudden crash before the stop triggers still hurts. Uses only market data — no external feed needed.
 */

function onUpdate(ctx) {
  const price = ctx.price;
  const emaF = ctx.ema(50, 1);
  const emaF2 = ctx.ema(50, 2);
  const emaS = ctx.ema(200, 1);
  const emaS2 = ctx.ema(200, 2);
  const atr = ctx.atr(14, 1);
  // all indicators must be ready; warm-up is 200 bars
  if (price == null || emaF == null || emaF2 == null || emaS == null || emaS2 == null || atr == null) return null;

  const st = ctx.state;
  // golden cross on CLOSED bars only (ago 1 vs 2) so live/backtest agree
  const crossedUp = emaF2 <= emaS2 && emaF > emaS;
  const crossedDown = emaF2 >= emaS2 && emaF < emaS;

  if (ctx.position <= 0) {
    if (crossedUp) {
      st.highest = price;
      ctx.watch([{ side: 'sell', price: price - 4 * atr, trigger: 'below', note: 'ATR stop' }]);
      // 80% of cash in, keep reserve; 4 ATR stop is wide enough for 4h noise
      return { side: 'buy', qty: ctx.cash / price * 0.8 };
    }
    return null;
  }

  // trailing stop rides the highest close since entry minus 4 ATR
  st.highest = Math.max(st.highest || price, price);
  const stop = st.highest - 4 * atr;
  ctx.watch([{ side: 'sell', price: stop, trigger: 'below', note: 'ATR trailing stop' }]);

  if (crossedDown || price < stop) {
    st.highest = 0;
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
