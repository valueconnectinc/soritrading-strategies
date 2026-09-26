/*
 * @coinsori-strategy v1
 * name: Volume-Confirmed Breakout ALGO 4H
 * ex: binance
 * syms: ALGOUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A trend-following complement to the defensive band-bounce
 * champion. The band-bounce family is mean-reversion and lags strong melt-ups;
 * this family rides breakouts instead, so it should capture the up-moves the
 * defensive recipe misses. Volume confirmation filters out false breakouts.
 * When it buys and sells: buys when price closes above the 20-bar high with a
 * volume surge while price is above the 200-SMA; exits on a trailing stop from
 * the highest close since entry (wider than the tight ATR stops that failed).
 * When it does NOT work: in choppy range-bound markets it gets whipsawed; a
 * breakout that immediately reverses still loses; the 200-SMA gate keeps it out
 * of sustained downtrends (good for defense, but it sits in cash). Trend
 * families on 4h have historically high MDD in violent corrections.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const hh20 = ctx.high(20, 1);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  if (sma200 == null || hh20 == null || avgVol == null || vol == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // trailing stop: exit when price closes below the highest close since entry by a margin
    const peak = ctx.state.peak || ctx.entryPx;
    if (price > peak) ctx.state.peak = price;
    const trailPct = 0.08; // 8% trailing from peak; wider than ATR stops that were too tight
    if (price <= peak * (1 - trailPct)) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price < sma200) return null; // trend gate: only buy above the long-term trend

  const volSurge = vol > avgVol * 1.8; // volume must be 80% above average to confirm the breakout
  if (price > hh20 && volSurge) {
    ctx.state.peak = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
