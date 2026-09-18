/*
 * @coinsori-strategy v1
 * name: EMA Crossover + RSI Gate — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Dual EMA crossover trend follower. Buy when EMA 9 crosses above EMA 21
 * AND RSI(14) > 50 (confirms momentum). Sell when EMA 9 crosses below EMA 21.
 * Simple, proven trend-following logic. Works in trending BTC markets.
 * Fails in choppy/range-bound BTC where EMAs cross repeatedly and RSI
 * oscillates around 50 — produces whipsaws.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);
  if (ema9 == null || ema21 == null || rsi == null) return null;

  // EMA crossover signals (ago=1 = previous closed bar for safety)
  const ema9Prev  = ctx.ema(9,  1);
  const ema21Prev = ctx.ema(21, 1);
  if (ema9Prev == null || ema21Prev == null) return null;

  // === ENTRY: EMA 9 crosses above EMA 21 AND RSI confirms ===
  if (!position) {
    const bullishCross = ema9Prev <= ema21Prev && ema9 > ema21;
    const rsiConfirm   = rsi > 50;

    if (bullishCross && rsiConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT: EMA 9 crosses below EMA 21 ===
  if (position) {
    const bearishCross = ema9Prev >= ema21Prev && ema9 < ema21;

    if (bearishCross) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
