/*
 * @coinsori-strategy v1
 * name: DOGEUSDT EMA Crossover 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Simple EMA 9/21 crossover trend-following on DOGEUSDT 4H.
 * Buy when EMA9 crosses above EMA21. Sell when EMA9 crosses below EMA21.
 * No filters — pure signal. Testing if engine executes on DOGE.
 *
 * When it buys and sells: Buys when the 9-bar EMA crosses above the 21-bar
 * EMA (uptrend confirmed). Sells when it crosses back below (trend reversed).
 *
 * When it does NOT work: Fails in choppy markets where EMAs cross repeatedly
 * causing whipsaw losses. DOGE's high volatility amplifies both gains and losses.
 */
function onUpdate(ctx) {
  const ema9 = ctx.ema(9, 0);
  const ema21 = ctx.ema(21, 0);
  const ema9_prev = ctx.ema(9, 1);
  const ema21_prev = ctx.ema(21, 1);

  if (ema9 == null || ema21 == null || ema9_prev == null || ema21_prev == null) return null;

  const hasPosition = ctx.position > 0;

  // EMA9 crosses above EMA21 → BUY
  if (!hasPosition) {
    if (ema9_prev <= ema21_prev && ema9 > ema21) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  // EMA9 crosses below EMA21 → SELL
  if (hasPosition) {
    if (ema9_prev >= ema21_prev && ema9 < ema21) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
