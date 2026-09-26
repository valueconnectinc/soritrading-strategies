/*
 * @coinsori-strategy v1
 * name: Volume-Surge Breakout ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Volume-momentum family, distinct from the Donchian trend
 * and Bollinger mean-reversion. A breakout on SURGING volume is more likely to
 * be real (institutional participation) than a quiet one. This recipe was
 * promising on BTC 4h (positive all 3 windows, beat hold 2/3, MDD 22-44%);
 * here I test whether it generalizes to ETH 4h.
 * When it buys and sells: buys when price breaks above the 20-bar high with
 * volume >1.5x the 20-bar average; exits when price falls below the 20-bar low.
 * When it does NOT work: in a choppy range, volume-surge breakouts whipsaw and
 * the 20-bar-low exit gives back gains; in a slow grind-up with no volume
 * surges it never enters and misses the move; a high-volume breakdown below the
 * 20-bar low on an exit is a false signal.
 */
function onUpdate(ctx) {
  const hh20 = ctx.high(20, 1);
  const ll20 = ctx.low(20, 1);
  const avgVol = ctx.avgVol(20);
  if (hh20 == null || ll20 == null || avgVol == null || ctx.vol == null) return null;
  if (ctx.volPrev == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price < ll20) return { side: 'sell', qty: pos };
    return null;
  }

  // Volume surge: current bar volume above 1.5x the 20-bar average.
  if (ctx.vol > avgVol * 1.5 && price > hh20) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
