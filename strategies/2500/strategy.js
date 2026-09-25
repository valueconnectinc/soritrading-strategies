/*
 * @coinsori-strategy v1
 * name: BTC 1D Trend-Following SMA Crossover
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: This is the OPPOSITE family from the mean-reversion champion.
 *   Instead of buying panic dips, it rides persistent trends. BTC has the
 *   strongest, most durable trends in crypto (multi-month bull/bear cycles), so
 *   trend-following should capture those sustained moves instead of fading them.
 * When it buys and sells: Buy when the fast 20-day SMA crosses above the slow
 *   100-day SMA (uptrend confirmed). Sell when the fast SMA crosses back below
 *   the 100-day (trend broken). A 15% trailing stop caps downside on sharp
 *   reversals between crossovers.
 * When it does NOT work: In choppy sideways ranges the crossovers whipsaw and
 *   churn fees with little progress. It also lags sharp V-shaped tops because
 *   the slow SMA reacts late — it gives back part of every peak.
 */
function onUpdate(ctx) {
  const f = ctx.sma(20, 1);
  const s = ctx.sma(100, 1);
  const fPrev = ctx.sma(20, 2);
  const sPrev = ctx.sma(100, 2);
  if (f == null || s == null || fPrev == null || sPrev == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // trailing stop: give back 15% from the highest since entry
    if (price < ctx.entryPx * 0.85) return { side: 'sell', qty: pos };
    // trend broken: fast SMA fell below slow SMA
    if (fPrev >= sPrev && f < s) return { side: 'sell', qty: pos };
    return null;
  }

  // uptrend confirmed: fast SMA crossed above slow SMA
  if (fPrev <= sPrev && f > s) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
