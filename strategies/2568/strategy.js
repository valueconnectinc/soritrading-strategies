/*
 * @coinsori-strategy v1
 * name: Defensive Donchian Trend ADA 1D
 * ex: binance
 * syms: ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Donchian channel breakout beats buy-and-hold on ADA 1d
 * but has 62-74% drawdown. The full-position defensive version (steep-downtrend
 * filter + ATR stop) improved returns over plain Donchian but kept high MDD;
 * continuous vol-targeting cut MDD but killed bull gains. This version takes a
 * middle path: full position normally (keeps the bull edge) but scales to half
 * size only when volatility is extreme (a crash-regime gate that cuts the worst
 * drawdowns without taxing normal bull runs).
 * When it buys and sells: buys when price breaks a 55-day high AND price is not
 * in a steep downtrend; sells on a 30-day low or a 3x-ATR disaster stop; size
 * is halved when ATR/price exceeds 8% (crash volatility).
 * When it does NOT work: it still underperforms buy-and-hold in choppy sideways
 * markets and cannot match the champion's low drawdown — it is a higher-risk
 * trend strategy.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || atr == null || ema50 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (price < ll30) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    // Crash-volatility gate: halve size only when daily vol exceeds 8% (a crash
    // regime) so normal bull runs keep full size but the worst drawdowns are cut.
    const crashVol = atr / price > 0.08;
    const sizeFrac = crashVol ? 0.5 : 0.99;
    return { side: 'buy', qty: ctx.cash / price * sizeFrac };
  }
  return null;
}
