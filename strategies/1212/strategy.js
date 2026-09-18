/*
 * @coinsori-strategy v1
 * name: EMA9/21 Trend Crossover — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Classic EMA crossover trend-follower. Goes long when EMA9 crosses above EMA21
 * (bullish momentum). Exits when EMA9 crosses below EMA21 or price drops below
 * EMA21 (momentum shift). Simple, no filters — follows the trend.
 * When it fails: whipsaws in choppy markets, late entry at trend end.
 */

function onUpdate(ctx) {
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  if (ema9 == null || ema21 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // Buy: EMA9 crosses above EMA21 (golden cross)
  if (!pos && ema9 > ema21) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Sell: EMA9 crosses below EMA21 (death cross)
  if (pos && ema9 < ema21) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
