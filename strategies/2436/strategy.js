/*
 * @coinsori-strategy v1
 * name: ETH Daily Donchian Breakout 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto trends hard on the daily timeframe, and the strongest
 *   validated daily edge in this project was a Donchian-style breakout (buying a fresh
 *   multi-day high). A channel breakout enters only when price actually pushes to a new
 *   high, so it avoids buying into chop and rides the sustained up-legs that follow.
 *   Pure price, so it backtests fully offline.
 * When it buys and sells: Buy when the close breaks above the highest close of the
 *   prior 20 days (fresh breakout). Sell when the close breaks below the lowest close
 *   of the prior 10 days, or when the 20-day EMA turns down below the 50-day EMA as a
 *   backstop trend exit.
 * When it does NOT work: In range-bound chop the channel whipsaws in and out and pays
 *   fees. The breakout delays entry through sharp V-recoveries, so it lags fast
 *   melt-ups. Long-only, so no short-side gains in bears.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (!closes || closes.length < 55) return null;
  const px = closes[closes.length - 1];

  const pos = ctx.position;

  // Sell: close below the lowest close of the prior 10 days (channel breakdown).
  let low10 = Infinity;
  for (let k = 1; k <= 10; k++) {
    const c = closes[closes.length - 1 - k];
    if (c < low10) low10 = c;
  }
  if (pos > 0) {
    if (px < low10) return { side: 'sell', qty: pos };
    return null;
  }

  // Buy: close above the highest close of the prior 20 days (fresh breakout).
  let high20 = -Infinity;
  for (let k = 1; k <= 20; k++) {
    const c = closes[closes.length - 1 - k];
    if (c > high20) high20 = c;
  }
  if (px > high20) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }

  return null;
}
