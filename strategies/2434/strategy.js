/*
 * @coinsori-strategy v1
 * name: ETH Daily EMA20/100 Trend (pure price)
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto trends hard and persistently on the daily timeframe, and
 *   the validated daily edge lives in a slow long-term trend with a faster short-term
 *   confirmation. This rides the daily trend using only price, so it can be backtested
 *   fully offline (no external data dependency).
 * When it buys and sells: Buy when the 20-day EMA crosses above the 100-day EMA AND
 *   price is above the 200-day average (long-term uptrend). Sell when the 20-day EMA
 *   crosses back below the 100-day EMA.
 * When it does NOT work: In straight-line melt-ups price stays above 200-day MA so it
 *   rides fine, but in choppy bear-recoveries the 20/100 cross whipsaws and it can
 *   re-enter late. It lags sharp V-recoveries and gives back some profit before the
 *   trend-break exit. Long-only, so no short-side gains in bears.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(20, 1);
  const slow = ctx.ema(100, 1);
  const lt = ctx.sma(200, 1);
  if (fast == null || slow == null || lt == null) return null;
  const price = ctx.closes[ctx.closes.length - 1];

  const pos = ctx.position;

  // Exit: short trend crossing back below the long trend.
  if (pos > 0) {
    if (fast < slow) return { side: 'sell', qty: pos };
    return null;
  }

  // Enter: short trend up AND price above the 200-day average (long-term uptrend).
  if (fast > slow && price > lt) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }

  return null;
}
